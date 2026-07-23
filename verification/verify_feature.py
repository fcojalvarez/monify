import json
import os
from playwright.sync_api import sync_playwright, expect

def run():
    # Make sure output directory exists
    os.makedirs("/app/verification", exist_ok=True)

    with sync_playwright() as p:
        # Launch browser in headless mode with Spanish locale!
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 450, "height": 800}, # mobile layout
            locale="es-ES" # Force browser locale to Spanish!
        )
        page = context.new_page()

        # Categories list stored in memory (9 items to force search box > 8)
        categories_db = [
            {
                "id": f"cat-{i}",
                "name": f"Categoría {i}",
                "icon": "solar:tag-bold",
                "color": "#3498db" if i % 2 == 0 else "#e74c3c",
                "kind": "expense",
                "monthly_limit": None
            }
            for i in range(1, 10)
        ]

        # Intercept and mock all Supabase API calls
        def handle_route(route):
            url = route.request.url
            method = route.request.method
            print(f"Intercepted {method} {url}")

            # Auth Token / Login
            if "/auth/v1/token" in url:
                session_obj = {
                    "access_token": "mock-access-token",
                    "refresh_token": "mock-refresh-token",
                    "expires_in": 3600,
                    "expires_at": 9999999999,
                    "token_type": "bearer",
                    "user": {
                        "id": "mock-user-id",
                        "aud": "authenticated",
                        "role": "authenticated",
                        "email": "test@example.com",
                        "user_metadata": {"display_name": "Usuario de Prueba"}
                    }
                }
                route.fulfill(status=200, content_type="application/json", body=json.dumps(session_obj))
                return

            # Auth / User details
            if "/auth/v1/user" in url:
                user_data = {
                    "id": "mock-user-id",
                    "aud": "authenticated",
                    "role": "authenticated",
                    "email": "test@example.com",
                    "user_metadata": {"display_name": "Usuario de Prueba"}
                }
                route.fulfill(status=200, content_type="application/json", body=json.dumps(user_data))
                return

            # Profiles
            if "/rest/v1/profiles" in url:
                profile_data = [{
                    "id": "mock-user-id",
                    "display_name": "Usuario de Prueba",
                    "savings_enabled": True,
                    "cash_enabled": True,
                    "currency": "EUR",
                    "locale": "es"
                }]
                route.fulfill(status=200, content_type="application/json", body=json.dumps(profile_data))
                return

            # Family Members
            if "/rest/v1/family_members" in url:
                members_data = [{
                    "id": "mock-member-id",
                    "name": "Usuario de Prueba",
                    "is_self": True,
                    "cash_balance": 100.0,
                    "color": "#3498db",
                    "avatar_icon": "solar:user-bold"
                }]
                route.fulfill(status=200, content_type="application/json", body=json.dumps(members_data))
                return

            # Categories
            if "/rest/v1/categories" in url:
                if method == "GET":
                    route.fulfill(status=200, content_type="application/json", body=json.dumps(categories_db))
                elif method == "POST":
                    post_data = route.request.post_data
                    payload = json.loads(post_data) if post_data else {}
                    new_id = f"cat-custom-{len(categories_db) + 1}"
                    new_cat = {
                        "id": new_id,
                        "name": payload.get("name", "Nueva Cat"),
                        "icon": payload.get("icon", "solar:tag-bold"),
                        "color": payload.get("color", "#9b59b6"),
                        "kind": payload.get("kind", "expense"),
                        "monthly_limit": payload.get("monthly_limit")
                    }
                    categories_db.append(new_cat)
                    print(f"Created category: {new_cat}")
                    route.fulfill(status=201, content_type="application/json", body=json.dumps(new_cat))
                return

            # Transactions & Recurring Transactions
            if "/rest/v1/transactions" in url or "/rest/v1/recurring_transactions" in url:
                route.fulfill(status=200, content_type="application/json", body="[]")
                return

            # Fallback
            route.continue_()

        # Set up routing
        page.route("**/localhost:54321/**/*", handle_route)

        # Go to the login page
        page.goto("http://localhost:5173")
        page.wait_for_timeout(1000)

        # Fill the login form
        # Spanish placeholders from es.json
        page.get_by_placeholder("tucorreo@ejemplo.com").fill("test@example.com")
        page.get_by_placeholder("••••••••").fill("password")

        # Click login button ("Iniciar sesión")
        page.get_by_role("button", name="Iniciar sesión").click()
        page.wait_for_timeout(2000)

        # 1. Capture Dashboard (Should now be in Spanish!)
        page.screenshot(path="/app/verification/01_dashboard.png")
        print("Captured dashboard.")

        # 2. Click "+ Añadir" button to open TransactionForm
        page.get_by_role("button", name="Añadir").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="/app/verification/02_transaction_form.png")
        print("Opened TransactionForm.")

        # 3. Click the category select
        page.get_by_role("button", name="Selecciona una categoría").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="/app/verification/03_category_select_open.png")
        print("Opened Category select options.")

        # 4. Type a search query to search for a new category
        page.get_by_placeholder("Buscar").fill("Ocio Nocturno")
        page.wait_for_timeout(1000)
        page.screenshot(path="/app/verification/04_searching_category.png")
        print("Searched for 'Ocio Nocturno'.")

        # 5. Click the "+ Crear categoría" footer button
        page.get_by_role("button", name="Crear categoría").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="/app/verification/05_category_form_dialog.png")
        print("Opened CategoryForm dialog.")

        # 6. Fill and save the category
        page.get_by_role("button", name="Crear categoría").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="/app/verification/06_category_saved_auto_selected.png")
        print("Saved new category. Returning to TransactionForm with 'Ocio Nocturno' selected.")

        # Close browser
        browser.close()

if __name__ == "__main__":
    run()
