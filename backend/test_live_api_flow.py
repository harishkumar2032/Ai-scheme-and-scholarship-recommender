import json
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

BASE_URL = "http://localhost:8000"


def get_csrf_token(cookie_jar):
    for domain in cookie_jar._cookies.values():
        for path in domain.values():
            if "csrftoken" in path:
                return path["csrftoken"].value
    return ""


def make_request(url, payload=None, method="GET", cookie_jar=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")

    if cookie_jar is not None and method.upper() != "GET":
        csrf_token = get_csrf_token(cookie_jar)
        if csrf_token:
            request.add_header("X-CSRFToken", csrf_token)

    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

    try:
        with opener.open(request, timeout=20) as response:
            body = response.read().decode("utf-8")
            print(f"[{method}] {url} -> {response.status}")
            print(body.encode("ascii", errors="replace").decode("ascii")[:400] + "...")
            return body
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        print(f"[{method}] {url} -> HTTP {e.code}")
        print(error_body)
        raise
    except urllib.error.URLError as e:
        print(f"[{method}] {url} -> Connection error: {e.reason}")
        raise
    except TimeoutError:
        print(f"[{method}] {url} -> Timeout after 20 seconds")
        raise


def main():
    cookie_jar = CookieJar()

    login_payload = {
        "username": "demo_student",
        "password": "demo12345",
    }

    profile_payload = {
        "age": 22,
        "gender": "Female",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "education_level": "PG",
        "course": "MCA",
        "college": "Anna University",
        "year_semester": "2026",
        "marks_or_cgpa": 86.5,
        "family_income": 250000,
        "category": "OBC",
        "disability_status": "None",
        "rural_urban": "Urban",
        "parent_occupation": "Government Employee",
        "first_generation": False,
        "hosteller": False,
        "college_type": "Government",
    }

    print("Testing login...\n")
    make_request(f"{BASE_URL}/api/users/login/", login_payload, method="POST", cookie_jar=cookie_jar)

    print("\nTesting profile save...\n")
    make_request(f"{BASE_URL}/api/students/me/", profile_payload, method="POST", cookie_jar=cookie_jar)

    print("\nTesting recommendation generation...\n")
    make_request(f"{BASE_URL}/api/recommendations/generate/", {}, method="POST", cookie_jar=cookie_jar)


if __name__ == "__main__":
    main()
