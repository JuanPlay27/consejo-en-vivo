"""Prueba de punta a punta en MODO ENSAYO: 1 pantalla + 3 celulares + 20 bots, todo el recorrido
(intro; por tema, diapositiva incompleta → pregunta → diapositiva completa; podio y conclusiones).

- Celular 1 responde todo bien (debe terminar con 5 000 puntos).
- Celular 2 responde todo mal o a medias.
- Celular 3 responde bien, salvo una pregunta que deja pasar (prueba "se acabó el tiempo").
- Además prueba volver atrás (←) desde una diapositiva y avanzar de nuevo.

Uso (con el servidor local corriendo en el puerto 8080):
    pip install playwright && playwright install chromium
    python3 tests/e2e_demo.py [carpeta_capturas]
"""
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:8080"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "capturas")
SKIP_FOR_PHONE_3 = "modelo"  # pregunta que el celular 3 no responde


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome")
        ctx = browser.new_context()
        screen = ctx.new_page()
        screen.set_viewport_size({"width": 1920, "height": 1080})
        watch(screen, "pantalla", errors)
        screen.goto(f"{BASE}/pantalla.html?demo&clave=consejo2026")
        screen.evaluate("localStorage.clear()")
        screen.reload()
        screen.wait_for_selector("#qr svg")
        flow = screen.evaluate("import('./js/content.js').then(m => m.FLOW)")
        questions = screen.evaluate("import('./js/content.js').then(m => m.QUESTION_BY_ID)")
        correct = screen.evaluate("Promise.all([import('./js/content.js'), import('./js/logic.js')]).then(([c, l]) => Object.fromEntries(c.QUESTIONS.map(q => [q.id, l.correctValue(q)])))")

        phones = []
        for i in range(3):
            phone = ctx.new_page()
            phone.set_viewport_size({"width": 390, "height": 844})
            watch(phone, f"celular{i + 1}", errors)
            phone.goto(f"{BASE}/index.html?demo")
            phone.wait_for_selector("text=Entrar ▶")
            if i == 0:
                phone.screenshot(path=OUT / "celular_00_entrar.png")
            phone.click("text=🎲 Otro nombre")
            phone.click("text=Entrar ▶")
            phone.wait_for_selector("text=consejeros conectados")
            phones.append(phone)

        for _ in range(4):
            screen.click("#hBots")
        expect_text(screen, "#lobbyCount", "23")
        screen.screenshot(path=OUT / "pantalla_00_lobby.png")
        screen.click("#hStart")
        went_back = False
        for step, item in enumerate(flow):
            name = item.get("slide") or item.get("question") or "podio"
            if item.get("partial"):
                name += "_intro"
            if "question" in item:
                q = questions[item["question"]]
                right = correct[item["question"]]
                for phone in phones:
                    phone.wait_for_selector(".p-qhead", timeout=10_000)
                time.sleep(1.0)
                phones[0].screenshot(path=OUT / f"celular_{step:02d}_{name}.png")
                answer(phones[0], q, right)
                answer(phones[1], q, wrong_value(q, right))
                if item["question"] != SKIP_FOR_PHONE_3:
                    answer(phones[2], q, right)
                time.sleep(3.0)
                screen.screenshot(path=OUT / f"pantalla_{step:02d}_{name}_pregunta.png")
                screen.wait_for_selector(".q-nexthint", timeout=40_000)
                time.sleep(1.6)
                screen.screenshot(path=OUT / f"pantalla_{step:02d}_{name}_revelado.png")
                phones[1].screenshot(path=OUT / f"celular_{step:02d}_{name}_resultado.png")
                if item["question"] == SKIP_FOR_PHONE_3:
                    assert phones[2].is_visible("text=No alcanzaste a responder"), "celular 3 debía quedar sin responder"
            else:
                time.sleep(1.4)  # deja terminar el deslizamiento
                screen.screenshot(path=OUT / f"pantalla_{step:02d}_{name}.png")
                if step == len(flow) - 1:
                    break
                if item.get("slide") == "que-es" and not item.get("partial") and not went_back:
                    went_back = True
                    screen.keyboard.press("ArrowLeft")
                    screen.wait_for_selector(".q-nexthint")
                    time.sleep(1.2)
                    screen.keyboard.press("Space")
                    screen.wait_for_selector(".s-medals")
                    time.sleep(1.2)
            screen.keyboard.press("Space")
            time.sleep(0.5)

        phones[0].screenshot(path=OUT / "celular_99_final.png")
        expect_text(phones[0], "#meScore", "5000 pts")

        screen.keyboard.press("r")
        screen.keyboard.press("r")
        phones[0].wait_for_selector("text=consejeros conectados")
        expect_text(phones[0], "#meScore", "0 pts")
        browser.close()

    if errors:
        raise SystemExit("Errores en consola:\n" + "\n".join(errors))
    print(f"OK: recorrido completo (introducción → pregunta → explicación ×5) con 23 participantes; capturas en {OUT}/")


def answer(phone, q, value):
    kind = q["type"]
    if kind == "single":
        phone.locator(".p-opt").nth(value).click()
    elif kind == "order":
        for item in value:
            phone.locator(".p-opt").nth(item).click()
        phone.click("text=Enviar orden ▶")
    elif kind == "number":
        diff = value - q.get("start", 10)
        sign = "+" if diff > 0 else "−"
        for _ in range(abs(diff)):
            phone.click(f".p-number button:has-text('{sign}')")
        phone.click("text=Enviar número ▶")
    elif kind == "multi":
        for i in value:
            phone.locator(".p-toggle").nth(i).click()
        phone.click("text=Enviar ▶")
    elif kind == "grid":
        for row, col in enumerate(value):
            phone.locator(".p-gridrow").nth(row).locator(".p-seg button").nth(col).click()
        phone.click("text=Enviar ▶")
    phone.wait_for_selector("text=¡Respuesta enviada!", timeout=5_000)


def wrong_value(q, right):
    kind = q["type"]
    if kind == "single":
        return (right + 1) % len(q["options"])
    if kind == "order":
        return list(reversed(right))
    if kind == "number":
        return 6  # la respuesta "de 2015": medio punto
    if kind == "multi":
        others = [i for i in range(len(q["options"])) if i not in right]
        return [right[0], others[0]]  # una de dos: medio punto
    if kind == "grid":
        return [(c + 1) % len(q["columns"]) for c in right]
    raise ValueError(kind)


def watch(page, label, errors):
    page.on("pageerror", lambda e: errors.append(f"[{label}] {e}"))
    page.on("console", lambda m: m.type == "error" and "fonts.g" not in m.text and "ERR_" not in m.text
            and errors.append(f"[{label}] {m.text}"))


def expect_text(page, selector, text, timeout=8.0):
    end = time.time() + timeout
    while time.time() < end:
        if (page.text_content(selector) or "").strip() == text:
            return
        time.sleep(0.1)
    raise AssertionError(f"{selector} = {page.text_content(selector)!r}, se esperaba {text!r}")


if __name__ == "__main__":
    main()
