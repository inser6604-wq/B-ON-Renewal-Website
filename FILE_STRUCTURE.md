# B&ON Universe 파일 구성 설계

## 1. 현재 상태와 표기

`README.md`, `design.md`, `PRD.md`, `TRD.md`를 기준으로 제안하는 최종 구조다. 현재는 문서 설계 단계이며 아래 Liquid, CSS, JavaScript, JSON 파일은 생성하지 않는다. 현재 저장소에 Dawn 테마 디렉터리는 없다.

- **기존 유지**: 현재 존재하며 수정하지 않는 파일·폴더.
- **이번 작성**: 이번 작업에서 작성하는 문서 2개.
- **추후 생성 예정**: 아직 없는 커스텀 파일 또는 Dawn 도입으로 확보할 파일. Dawn 기본 파일은 신규 재작성하지 않고 도입 후 유지한다.
- `images`는 로컬 원본 보관 폴더다. Shopify가 루트 폴더를 자동 제공한다고 가정하지 않는다. 향후 별도 사본을 Shopify Files 등에 업로드하고 image_picker로 연결하되 원본은 변경하지 않는다.

## 2. 제안 트리

```text
/
├── README.md                              [기존 유지]
├── design.md                              [기존 유지]
├── PRD.md                                 [기존 유지]
├── TRD.md                                 [기존 유지]
├── IMPLEMENTATION_PLAN.md                  [이번 작성]
├── FILE_STRUCTURE.md                       [이번 작성]
├── bnon-universe-3d-planets-bigger.html      [기존 유지: 원본]
├── images/                                [기존 유지: 하위 파일 전체 보존]
│   ├── main-protfolio-img/                 [기존 철자 유지]
│   │   ├── MONCLOS-mockup.png
│   │   ├── portfolio-fullscreen-img01.png
│   │   └── portfolio-fullscreen-img02.png
│   └── our-universe-img/
│       ├── orbit-01.png … orbit-25.png     [기존 25개]
│       └── Frame 119.png / Frame 133.png / Frame 134.png / Frame 153.png
├── layout/                                [추후 생성 예정: Dawn 도입]
│   └── theme.liquid                       [Dawn 도입 후 최소 연결 변경 검토]
├── assets/                                [추후 생성 예정]
│   ├── bnon-base.css
│   ├── bnon-interactions.js
│   ├── bnon-universe-3d-planets-bigger.html [조건부: 임베드 검증 후 배포용 사본]
│   └── (Dawn 기본 assets)                 [도입 후 유지]
├── sections/                              [추후 생성 예정]
│   ├── header-group.json                  [Dawn 도입 후 그룹 구성 조정 예정]
│   ├── footer-group.json                  [Dawn 도입 후 그룹 구성 조정 예정]
│   ├── bnon-header.liquid
│   ├── bnon-footer.liquid
│   ├── bnon-hero.liquid
│   ├── bnon-main-portfolio.liquid
│   ├── bnon-what-we-do.liquid
│   ├── bnon-process.liquid
│   ├── bnon-our-universe.liquid
│   ├── bnon-faq.liquid
│   ├── bnon-contact-cta.liquid
│   ├── bnon-portfolio-gallery.liquid
│   ├── bnon-portfolio-grid.liquid
│   ├── bnon-service-stack.liquid
│   ├── bnon-contact-form.liquid
│   ├── bnon-about-intro.liquid
│   ├── bnon-about-proof.liquid
│   └── (Dawn 기본 sections)               [도입 후 유지]
├── snippets/                              [추후 생성 예정]
│   ├── bnon-project-card.liquid
│   ├── bnon-project-preview-modal.liquid
│   ├── bnon-responsive-image.liquid
│   ├── bnon-button.liquid
│   ├── bnon-service-content.liquid
│   └── (Dawn 기본 snippets)               [도입 후 유지]
├── templates/                             [추후 생성 예정]
│   ├── index.json                         [Dawn 도입 후 기존 파일의 구성 변경 예정]
│   ├── page.portfolio.json
│   ├── page.service.json
│   ├── page.contact.json
│   ├── page.about.json
│   └── (Dawn 기본 templates)              [도입 후 유지]
├── config/                                [추후 생성 예정: Dawn 도입 후 유지]
└── locales/                               [추후 생성 예정: Dawn 도입 후 유지]
```

트리의 괄호 및 생략 표기는 파일 이름이 아닌 보존 범위 설명이다. 모든 신규 테마 파일은 **추후 생성 예정**이다. 폰트는 Archivo/Pretendard의 제공 방식과 사용 가능한 파일을 확인한 뒤 필요한 경우에만 assets에 추가하며 현재 임의의 폰트 파일명을 확정하지 않는다.

## 3. 파일별 역할

| 파일 또는 파일군 | 역할 | 상태 |
| --- | --- | --- |
| `README.md`, `design.md`, `PRD.md`, `TRD.md` | 프로젝트·디자인·제품·기술 기준 | 기존 유지 |
| `IMPLEMENTATION_PLAN.md` | 순서, 완료 조건, 위험 항목과 검수 계획 | 이번 작성 |
| `FILE_STRUCTURE.md` | 파일 책임, 템플릿 연결, schema와 자산 연결 계획 | 이번 작성 |
| 루트 `bnon-universe-3d-planets-bigger.html` | Hero 모션 검토용 원본 | 기존 유지 |
| `images/` | 기존 이미지 원본 보관 | 기존 유지 |
| `layout/theme.liquid` | Dawn 공통 문서 구조 유지, 전용 asset 로드 및 조건부 공통 모달 1개 연결 | 추후 생성 예정: Dawn 도입 |
| `assets/bnon-base.css` | 색상·폰트·간격 토큰, 모든 B&ON 섹션 스타일, 반응형·모션 감소 규칙 | 추후 생성 예정 |
| `assets/bnon-interactions.js` | section별 초기화·해제, 탭·아코디언·Process·궤도·모달·편집기 이벤트 | 추후 생성 예정 |
| `assets/bnon-universe-3d-planets-bigger.html` | 검증 통과 시 Hero 임베드용 배포 사본; 실패하면 생성하지 않고 정적 이미지/SVG 방식 선택 | 조건부 추후 생성 예정 |
| `sections/header-group.json`, `sections/footer-group.json` | 공통 Header/Footer 섹션 연결; 원본 Dawn 섹션 삭제 없이 구성 변경 | 추후 생성 예정: Dawn 도입 |
| `sections/bnon-header.liquid` | 텍스트 로고, 메뉴, 프로젝트 문의, 모바일 메뉴 | 추후 생성 예정 |
| `sections/bnon-footer.liquid` | 회사 정보, 메뉴, 문의 링크 | 추후 생성 예정 |
| `sections/bnon-hero.liquid` | 회색 Hero, 브랜드 카피, 민트 점, 블루 CTA, 모션·대체 이미지 | 추후 생성 예정 |
| `sections/bnon-main-portfolio.liquid` | 대표 프로젝트 탭과 배경·목업·상세 동기화 | 추후 생성 예정 |
| `sections/bnon-what-we-do.liquid` | 5개 서비스 아코디언 | 추후 생성 예정 |
| `sections/bnon-process.liquid` | 6단계 선택, 이미지와 진행 바 | 추후 생성 예정 |
| `sections/bnon-our-universe.liquid` | 이미지 궤도 및 정적 대체 배치 | 추후 생성 예정 |
| `sections/bnon-faq.liquid` | 질문·답변 아코디언 | 추후 생성 예정 |
| `sections/bnon-contact-cta.liquid` | 프로젝트 문의와 카카오톡 문의 선택 | 추후 생성 예정 |
| `sections/bnon-portfolio-gallery.liquid` | Portfolio 제목·설명, 크기·위치가 다른 카드와 선택 강조 | 추후 생성 예정 |
| `sections/bnon-portfolio-grid.liquid` | 전체 프로젝트 공개 여부·카드 크기·배치 관리 | 추후 생성 예정 |
| `sections/bnon-service-stack.liquid` | 서비스 상세와 Desktop sticky stack | 추후 생성 예정 |
| `sections/bnon-contact-form.liquid` | Shopify contact form과 필수 검증·결과 안내·카카오톡 링크 | 추후 생성 예정 |
| `sections/bnon-about-intro.liquid` | 회사 소개 골격과 추후 콘텐츠 입력 | 추후 생성 예정 |
| `sections/bnon-about-proof.liquid` | 확정된 파트너·리뷰만 노출하는 블록 영역 | 추후 생성 예정 |
| `snippets/bnon-project-card.liquid` | 프로젝트 카드와 모달 열기 버튼, 일관된 프로젝트 데이터 | 추후 생성 예정 |
| `snippets/bnon-project-preview-modal.liquid` | 페이지당 단일 모달, 캡처 표시·정지·닫기 UI | 추후 생성 예정 |
| `snippets/bnon-responsive-image.liquid` | 반응형 이미지 크기·alt·로딩 우선순위 공통 처리 | 추후 생성 예정 |
| `snippets/bnon-button.liquid` | 링크/버튼 목적에 맞는 CTA 표현, 블루 기본 스타일 | 추후 생성 예정 |
| `snippets/bnon-service-content.liquid` | Home/Service의 서비스명·설명·태그·이미지 공통 마크업 | 추후 생성 예정 |
| `templates/index.json` | Home section 순서·초기 구성 | 추후 생성 예정: Dawn 도입 후 구성 변경 |
| `templates/page.portfolio.json` | Portfolio 갤러리·전체 목록 구성 | 추후 생성 예정 |
| `templates/page.service.json` | 서비스 stack과 문의 동선 구성 | 추후 생성 예정 |
| `templates/page.contact.json` | 문의 폼 구성 | 추후 생성 예정 |
| `templates/page.about.json` | 소개·파트너·리뷰 골격 구성 | 추후 생성 예정 |
| Dawn 기본 assets/sections/snippets/templates/config/locales | 기존 테마 기능과 설정·번역 유지; 필요한 변경만 별도 검토 | 추후 생성 예정: Dawn 도입 |

## 4. 템플릿과 section 연결

모든 페이지는 `theme.liquid`의 header/footer group을 통해 `bnon-header`와 `bnon-footer`를 공유한다. 이를 각 페이지 JSON에 중복 삽입하지 않는다. 아래 목록은 본문 표시 순서이며 모두 추후 구성 예정이다.

| 페이지 / 템플릿 | 본문 section 순서 |
| --- | --- |
| Home / `index.json` | `bnon-hero` → `bnon-main-portfolio` → `bnon-what-we-do` → `bnon-process` → `bnon-our-universe` → `bnon-faq` → `bnon-contact-cta` |
| Portfolio / `page.portfolio.json` | `bnon-portfolio-gallery` → `bnon-portfolio-grid` → `bnon-contact-cta` |
| Service / `page.service.json` | `bnon-service-stack` → `bnon-contact-cta` |
| Contact / `page.contact.json` | `bnon-contact-form` (카카오톡 CTA 포함) |
| About / `page.about.json` | `bnon-about-intro` → `bnon-about-proof` → `bnon-contact-cta` |

Shopify 관리자에서 `/pages/portfolio`, `/pages/service`, `/pages/contact`, `/pages/about` 페이지에 해당 템플릿을 지정하는 운영 작업도 추후 필요하다. JSON 파일만으로 관리자 페이지가 자동 생성되지는 않는다.

공통 모달은 Home/Portfolio 템플릿에 한해 레이아웃에서 1회 렌더링하는 방향이다. 갤러리·그리드·대표 프로젝트 section에서는 카드 데이터만 제공한다. 다른 템플릿에 프로젝트 section을 추가하도록 범위를 확장하면 모달 연결 조건도 함께 확장한다.

## 5. Section schema 설계

아래는 **추후 생성 예정 schema**의 필드 설계이며 실행 코드가 아니다. 텍스트는 text/textarea/richtext, 링크는 url, 이미지는 image_picker, 상태는 checkbox, 선택지는 select, 속도·크기는 range를 우선한다. 반복 항목 순서는 Theme Editor의 블록 순서를 사용한다. 배경 모드는 확정된 디자인 팔레트 안에서 선택하게 한다.

| Section | 주요 settings | block 종류와 필드 |
| --- | --- | --- |
| `bnon-header` | `logo_text`(기본 B&ON UNIVERSE), `logo_image`(추후 공식 로고), `menu`(link_list), `contact_label`, `contact_link` | 없음; 메뉴는 Shopify 메뉴 관리 사용 |
| `bnon-footer` | `logo_text`, `description`, `menu`(link_list), `company_info`, `copyright`, `contact_label`, `contact_link`, `kakao_url` | 없음 |
| `bnon-hero` | `heading`, `accent_text`(기본 .), `keyword_line`, `description`, `portfolio_label`, `portfolio_link`, `contact_label`, `contact_link`, `show_universe`, `universe_fallback` | 없음; 배경은 Gray 토큰 적용 |
| `bnon-main-portfolio` | `eyebrow`, `heading`, `next_hint_label`, `show_next_hint`, `default_tab` | `project_tab` 최대 6개: `tab_label`, `project_title`, `category`, `description`, `background_image`, `mockup_image`, `desktop_long_image`, `mobile_long_image`, `external_link`, `alt`, `published` |
| `bnon-what-we-do` | `heading`, `headline`, `description`, `default_open`, `background_mode` | `service_item` 최대 5개: `number`, `english_title`, `korean_title`, `description`, `tag_1`, `tag_2`, `tag_3`, `image`, `alt`, `cta_label`, `cta_link` |
| `bnon-process` | `eyebrow`, `heading`, `description`, `activation_mode`(스크롤/버튼), `progress_duration` | `process_step` 최대 6개: `number`, `title`, `description`, `confirm_label`, `image`, `alt` |
| `bnon-our-universe` | `heading`, `description`, `enable_motion`, `orbit_speed` | `orbit_item`: `title`, `image`, `alt`, `orbit_position`, `size` |
| `bnon-faq` | `heading`, `allow_multiple_open` | `faq`: `question`, `answer`(richtext) |
| `bnon-contact-cta` | `heading`, `description`, `project_label`, `project_link`, `kakao_label`, `kakao_url` | 없음 |
| `bnon-portfolio-gallery` | `heading`(PORTFOLIO), `description`, `accent_text`(Brands We’ve Built With.) | `gallery_project`: `title`, `category`, `thumbnail`, `thumbnail_alt`, `desktop_long_image`, `mobile_long_image`, `external_link`, `preview_speed`, `published`. 추가 제안: `card_size`(크기), `position_preset`(배치) |
| `bnon-portfolio-grid` | `heading`, `description` | `project`: 갤러리 공통 필드 + `grid_size`(large/medium/small), `featured`; 위치는 블록 순서로 결정 |
| `bnon-service-stack` | `heading`, `description`, `enable_stack` | `service_item` 최대 5개: What We Do와 동일한 서비스 필드 |
| `bnon-contact-form` | `heading`, `description`, `submit_label`, `success_message`, `error_message`, `kakao_url`. 추가 제안: `kakao_label` | 없음; 필수 입력 항목은 운영자가 제거할 수 없도록 고정 |
| `bnon-about-intro` | `heading`, `description`(richtext), `image`, `alt` | 없음; 확정되지 않은 설명·이미지는 미노출 |
| `bnon-about-proof` | `heading`, `description` | `partner`: `name`, `image`, `alt`, `link`, `published`; `review`: `quote`, `author`, `organization`, `published` |

추가 운영 규칙:

- `default_tab`, `default_open`은 블록 순서 기반 기본 선택으로 설명하고, 삭제·비공개로 유효하지 않으면 첫 유효 항목으로 복구한다. Process 진행 시간은 자동 단계 전환이 아니라 상태 변화 표현에 사용한다.
- 프로젝트 이미지마다 필요하면 `desktop_alt`, `mobile_alt`, `background_alt`, `mockup_alt`를 추가한다. 장식 배경은 빈 alt 처리하고 캡처에는 프로젝트명·기기 종류가 전달되게 한다.
- 프로젝트 미리보기 속도는 Main Portfolio에도 동일한 기본값을 적용하고 필요 시 `preview_speed` 설정을 확장한다. 속도 단위·최소·최대는 구현 검증에서 확정한다.
- 갤러리 크기·배치 선택은 Desktop에 적용하고 Tablet/Mobile에서는 읽기 순서에 맞춰 정규 그리드로 재배치한다. 카드 크기와 공개 여부는 운영자가 변경할 수 있어야 한다.
- 서비스 초기 5종은 Shopify Store Development / Digital Marketing / US Corporation & 3PL / Amazon / Shopify Education이다.
- Contact 필수 필드는 담당자명 `contact[contact_person]`, 이메일 `contact[email]`, 문의사항 `contact[body]`다. Shopify 기본 contact form을 사용하며 편집 가능한 메시지와 서버 검증 결과를 함께 표시한다.
- About 파트너·리뷰는 최종 콘텐츠를 받은 뒤 블록을 추가·공개한다. 빈 카드나 검증되지 않은 실적 수치를 노출하지 않는다.
- section presets와 블록 편집 식별자를 준비하고 편집기 재로드·블록 선택에 대응한다. 서로 다른 section의 서비스·프로젝트 block 데이터는 자동 동기화되지 않는다.

## 6. 공통 snippet 계약

| Snippet | 입력 및 재사용 위치 |
| --- | --- |
| `bnon-project-card` | section/block 고유 ID, 제목, 카테고리, 썸네일·alt, 긴 캡처 2종, 링크, 크기, 속도. Main Portfolio·갤러리·그리드에서 재사용; 서로 다른 필드명은 호출 section이 공통 이름으로 매핑 |
| `bnon-project-preview-modal` | 공통 dialog 이름과 UI 문구. 카드 선택 데이터로 내용 갱신; Home/Portfolio 페이지당 1개, ESC·닫기·포커스 복귀·자동/수동 보기 제공 |
| `bnon-responsive-image` | 이미지 객체, alt, 표시 크기, sizes, 로딩 우선순위. Hero 대체·프로젝트·서비스·Process·About에서 공유 |
| `bnon-button` | label, url 또는 버튼 목적, 스타일 변형, 접근성 이름. CTA와 동작 버튼의 올바른 의미를 유지 |
| `bnon-service-content` | 영문명·한글명·설명·태그 3개·이미지·alt·링크. What We Do와 Service의 콘텐츠 표현 공유 |

Snippet에는 독립 section schema를 두지 않는다. 상위 section의 settings/blocks를 전달하며 문자열과 JSON 데이터는 출력 문맥에 맞게 안전하게 처리할 예정이다.

## 7. 기존 images 연결 계획

| 현재 경로 | 향후 연결할 영역 | 계획과 확인 사항 |
| --- | --- | --- |
| `images/main-protfolio-img/MONCLOS-mockup.png` | Main Portfolio MONCLOS `mockup_image`; 필요 시 Portfolio 썸네일 | 실제 내용·해상도 확인 후 업로드 사본 선택 |
| `images/main-protfolio-img/portfolio-fullscreen-img01.png` | Main Portfolio 배경 또는 프로젝트 캡처 후보 | 이름만으로 프로젝트·기기 종류를 확정하지 않음; 시각 확인 후 `background_image` 또는 긴 캡처 필드 연결 |
| `images/main-protfolio-img/portfolio-fullscreen-img02.png` | Main Portfolio / Portfolio 미리보기 후보 | 이미지 내용·세로 길이·권리 확인 후 해당 필드 연결; desktop/mobile이라고 임의 단정하지 않음 |
| `images/our-universe-img/orbit-01.png` ~ `orbit-25.png` | Our Universe `orbit_item.image` | 사용할 이미지만 선택해 궤도 위치·크기 지정, 모바일은 정적 배치 |
| `images/our-universe-img/Frame 119.png`, `Frame 133.png`, `Frame 134.png`, `Frame 153.png` | Our Universe 보조 이미지 또는 Hero 정적 대체 후보 | 실제 시각 내용 확인 후 적합한 경우에만 연결 |

현재 파일명·폴더명·내용은 그대로 유지한다. 특히 `main-protfolio-img` 철자를 수정하지 않는다. 향후 업로드·최적화가 필요하면 별도 배포용 사본을 만들고 원본에 덮어쓰지 않는다. Hero 대체, 추가 프로젝트, 서비스·Process·About에 필요한 자산이 부족하면 콘텐츠 대기 항목으로 관리한다.

## 8. 공통 구현 제약과 미구현 범위

- 모든 화면은 Archivo/Pretendard 및 Black `#0A0A0A`, White `#FFFFFF`, Gray `#F5F2F2`, Blue `#3154EE`, Mint `#28DBC4`를 공통 토큰으로 사용한다. Hero는 밝은 회색, 프로젝트 문의는 블루, 활성 탭·강조는 민트다. 공식 로고 전에는 `B&ON UNIVERSE` 텍스트를 쓴다.
- Desktop 1024px 이상, Tablet 768~1023px, Mobile 767px 이하 및 480px 이하 세부 조정을 계획한다. 375px까지 잘림 없이 확인한다.
- `bnon-interactions.js`는 section 인스턴스별로 동작하고 unload 시 정리한다. 모달은 페이지 공통 관리자 1개로 관리한다. reduced motion에서는 궤도·캡처·진행 애니메이션을 정지하고 정적·수동 접근을 유지한다.
- 이번에는 이 문서와 구현 계획만 작성한다. 모든 테마 파일·schema·템플릿 연결·폰트/이미지 업로드·애니메이션·폼·QA·배포는 **아직 구현하지 않았으며 추후 진행 예정**이다.
