# 스도쿠 (웹앱)
광고·추적·외부 CDN 없는 정적 웹앱. `index.html`을 HTTPS로 호스팅한 뒤 아이패드 Safari에서 열고
공유 버튼 → "홈 화면에 추가"를 누르면 앱처럼 실행됩니다. 처음 한 번 인터넷으로 열면 이후 오프라인에서도 동작합니다.

파일: index.html, style.css, engine.js(생성기/풀이기), game.js(게임 규칙), app.js(화면), sw.js(오프라인), manifest.json, icons/
테스트: tests/browser_test.py (playwright, 834x1194 / 1194x834 터치)
