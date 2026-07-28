"""Tests for the /v1/users admin endpoints.

These endpoints expose CRUD functions (get_users, update_user, delete_user,
activate_user, deactivate_user) that were already fully implemented and
covered by CRUD-layer tests in tests/integration/test_crud.py, but were
never reachable through the API before this fix.
"""

from fastapi.testclient import TestClient


def test_list_users_requires_superuser(client: TestClient, auth_headers: dict):
    response = client.get("/v1/users/", headers=auth_headers)
    assert response.status_code == 403


def test_list_users_unauthenticated(client: TestClient):
    response = client.get("/v1/users/")
    assert response.status_code == 401


def test_list_users_as_superuser(client: TestClient, superuser_auth_headers: dict):
    response = client.get("/v1/users/", headers=superuser_auth_headers)
    assert response.status_code == 200
    emails = [u["email"] for u in response.json()]
    assert "admin@example.com" in emails


def test_get_user_by_id(client: TestClient, superuser_auth_headers: dict, test_user):
    response = client.get(f"/v1/users/{test_user.id}", headers=superuser_auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == test_user.email


def test_get_user_by_id_not_found(client: TestClient, superuser_auth_headers: dict):
    response = client.get("/v1/users/999999", headers=superuser_auth_headers)
    assert response.status_code == 404


def test_get_user_by_id_requires_superuser(
    client: TestClient, auth_headers: dict, test_user
):
    response = client.get(f"/v1/users/{test_user.id}", headers=auth_headers)
    assert response.status_code == 403


def test_admin_update_user_email(
    client: TestClient, superuser_auth_headers: dict, test_user
):
    response = client.patch(
        f"/v1/users/{test_user.id}",
        headers=superuser_auth_headers,
        json={"email": "admin-changed@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "admin-changed@example.com"


def test_admin_update_user_can_set_is_active(
    client: TestClient, superuser_auth_headers: dict, test_user
):
    response = client.patch(
        f"/v1/users/{test_user.id}",
        headers=superuser_auth_headers,
        json={"is_active": False},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_admin_update_user_not_found(client: TestClient, superuser_auth_headers: dict):
    response = client.patch(
        "/v1/users/999999",
        headers=superuser_auth_headers,
        json={"email": "x@example.com"},
    )
    assert response.status_code == 404


def test_admin_update_user_requires_superuser(
    client: TestClient, auth_headers: dict, test_user
):
    response = client.patch(
        f"/v1/users/{test_user.id}",
        headers=auth_headers,
        json={"email": "x@example.com"},
    )
    assert response.status_code == 403


def test_admin_delete_user(client: TestClient, superuser_auth_headers: dict, test_user):
    response = client.delete(
        f"/v1/users/{test_user.id}", headers=superuser_auth_headers
    )
    assert response.status_code == 204
    follow_up = client.get(f"/v1/users/{test_user.id}", headers=superuser_auth_headers)
    assert follow_up.status_code == 404


def test_admin_delete_user_not_found(client: TestClient, superuser_auth_headers: dict):
    response = client.delete("/v1/users/999999", headers=superuser_auth_headers)
    assert response.status_code == 404


def test_admin_cannot_delete_own_account_via_admin_route(
    client: TestClient, superuser_auth_headers: dict, superuser
):
    response = client.delete(
        f"/v1/users/{superuser.id}", headers=superuser_auth_headers
    )
    assert response.status_code == 400


def test_admin_deactivate_and_reactivate_user(
    client: TestClient, superuser_auth_headers: dict, test_user
):
    deactivate = client.post(
        f"/v1/users/{test_user.id}/deactivate", headers=superuser_auth_headers
    )
    assert deactivate.status_code == 200
    assert deactivate.json()["is_active"] is False

    activate = client.post(
        f"/v1/users/{test_user.id}/activate", headers=superuser_auth_headers
    )
    assert activate.status_code == 200
    assert activate.json()["is_active"] is True


def test_deactivated_user_cannot_log_in(
    client: TestClient, superuser_auth_headers: dict, test_user
):
    client.post(f"/v1/users/{test_user.id}/deactivate", headers=superuser_auth_headers)
    login = client.post(
        "/v1/auth/token",
        data={"username": test_user.email, "password": "testpassword123"},
    )
    assert login.status_code == 400


def test_admin_cannot_deactivate_own_account(
    client: TestClient, superuser_auth_headers: dict, superuser
):
    response = client.post(
        f"/v1/users/{superuser.id}/deactivate", headers=superuser_auth_headers
    )
    assert response.status_code == 400
