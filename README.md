# TF-IDF 계산기

브라우저에서 바로 열 수 있는 수업용 TF-IDF 계산기입니다.

## 실행 방법

1. `/Volumes/Transcend/tf-idf/index.html` 파일을 브라우저에서 엽니다.
2. 문서별 제목과 내용을 입력합니다.
3. `분석하기` 버튼을 누릅니다.

## 포함 기능

- 기본 불용어 자동 제거
- 사용자 정의 불용어 추가
- IDF 계산 방식 선택
- TF 테이블
- DF / IDF 테이블
- TF-IDF 테이블
- 문서별 핵심어 요약
- CSV 다운로드

## GitHub Pages 배포

- 이 프로젝트는 정적 사이트라서 GitHub Pages에 바로 배포할 수 있습니다.
- 저장소를 GitHub에 올린 뒤 `Settings -> Pages -> Build and deployment -> Source`에서 `Deploy from a branch`를 선택합니다.
- 브랜치는 `main`, 폴더는 `/(root)`를 선택하면 됩니다.
- 저장소 주소가 `https://github.com/<사용자이름>/<저장소이름>` 이라면 기본 배포 주소는 `https://<사용자이름>.github.io/<저장소이름>/` 입니다.

## 참고

- 외부 AI API 없이 동작합니다.
- 현재 버전은 규칙 기반 토큰화와 기본 불용어 목록을 사용합니다.
- 아주 정교한 한국어 형태소 분석이 필요하면 별도의 한국어 NLP 라이브러리를 연결하면 더 좋아집니다.
