# B&ON Universe Shopify 구현 명세 (TRD)

## 1. 기술 기준

| 항목 | 결정 |
| --- | --- |
| 기반 테마 | Dawn / Shopify Online Store 2.0 |
| 페이지 구성 | JSON template + Section |
| 화면 구현 | Liquid + CSS |
| 인터랙션 | Vanilla JavaScript, Section 단위 초기화 |
| 콘텐츠 관리 | Section settings + blocks schema |
| 폰트 | Archivo / Pretendard |

커스텀 클래스·데이터 속성은 `bnon-` 접두어를 사용합니다. Dawn의 기본 파일을 불필요하게 덮어쓰지 않고 새 CSS/JS를 분리합니다.

## 2. 파일 구조

```text
assets/
  bnon-base.css
  bnon-interactions.js
  bnon-universe-3d-planets-bigger.html
sections/
  bnon-hero.liquid
  bnon-main-portfolio.liquid
  bnon-what-we-do.liquid
  bnon-process.liquid
  bnon-our-universe.liquid
  bnon-faq.liquid
  bnon-contact-cta.liquid
  bnon-portfolio-gallery.liquid
  bnon-portfolio-grid.liquid
  bnon-service-stack.liquid
  bnon-contact-form.liquid
snippets/
  bnon-project-card.liquid
  bnon-project-preview-modal.liquid
templates/
  index.json / page.portfolio.json / page.service.json
  page.contact.json / page.about.json
```

## 3. Section schema

### `bnon-hero`

| id | type | 설명 |
| --- | --- | --- |
| `heading` | textarea | Hero 대제목 |
| `accent_text` | text | 민트 강조 문자. 초기값 `.` |
| `keyword_line` | text | `SHOPIFY · DESIGN · GLOBAL COMMERCE` |
| `description` | textarea | 우측 한글 설명 |
| `portfolio_label` / `portfolio_link` | text/url | `VIEW PORTFOLIO ↓` |
| `contact_label` / `contact_link` | text/url | 프로젝트 문의 CTA |
| `show_universe` | checkbox | 우측 SVG/3D 표시 여부 |
| `universe_fallback` | image_picker | 애니메이션 불가 시 이미지 |

Hero 배경 초기값은 `#F5F2F2`입니다. SVG/3D는 iframe 또는 Shopify asset 로드 방식의 보안·반응형 검증 후 삽입합니다.

### `bnon-main-portfolio`

Section settings: `eyebrow`, `heading`, `next_hint_label`, `show_next_hint`, `default_tab`.

Block `project_tab` (최대 6개): `tab_label`, `project_title`, `category`, `description`, `background_image`, `mockup_image`, `desktop_long_image`, `mobile_long_image`, `external_link`, `alt`, `published`.

Liquid에서는 `published` block만 렌더링합니다. 버튼은 `role="tab"`, 패널은 `role="tabpanel"`로 연결하고, 활성 탭에 민트 밑줄을 적용합니다.

### `bnon-what-we-do`

Section settings: `heading`, `headline`, `description`, `default_open`, `background_mode`.

Block `service_item` (최대 5개): `number`, `english_title`, `korean_title`, `description`, `tag_1`, `tag_2`, `tag_3`, `image`, `alt`, `cta_label`, `cta_link`.

열린 항목은 블루 라벨 + 다크 상세 영역, 닫힌 항목은 제목/화살표만 보입니다. 버튼의 `aria-expanded`를 갱신하고 기본은 한 항목만 열리게 합니다.

### `bnon-process`

Section settings: `eyebrow`, `heading`, `description`, `activation_mode`, `progress_duration`.

Block `process_step` (최대 6개): `number`, `title`, `description`, `confirm_label`, `image`, `alt`.

IntersectionObserver로 화면 중앙에 들어온 단계를 활성화합니다. 활성 단계가 이미지와 progress bar를 함께 바꾸며, 터치/키보드용 단계 버튼도 제공합니다.

### `bnon-our-universe`

Section settings: `heading`, `description`, `enable_motion`, `orbit_speed`.

Block `orbit_item`: `title`, `image`, `alt`, `orbit_position`, `size`.

제공 이미지 폴더를 사용하며 CSS `transform` 중심으로 움직입니다. reduced motion 또는 모바일에서는 정적 배치로 전환합니다.

### `bnon-faq`

Section settings: `heading`, `allow_multiple_open`.

Block `faq`: `question`, `answer`.

`details/summary` 또는 button/panel 구조를 사용합니다. 커스텀 스타일을 써도 키보드 동작과 `aria-expanded`는 유지합니다.

### `bnon-contact-cta` / `bnon-contact-form`

CTA settings: `heading`, `description`, `project_label`, `project_link`, `kakao_label`, `kakao_url`.

Form settings: `heading`, `description`, `submit_label`, `success_message`, `error_message`, `kakao_url`.

폼은 `{% form 'contact' %}`를 사용합니다.

```liquid
contact[contact_person]  # 담당자명, required
contact[email]           # 이메일, type=email, required
contact[body]            # 문의사항, required
```

## 4. Portfolio 페이지 schema

`bnon-portfolio-gallery` block `gallery_project`: `title`, `category`, `thumbnail`, `thumbnail_alt`, `desktop_long_image`, `mobile_long_image`, `external_link`, `preview_speed`, `published`.

`bnon-portfolio-grid` block `project`: 위 공통 필드 + `grid_size` select (`large`, `medium`, `small`) + `featured` checkbox.

desktop은 large 7, medium 5, small 3개 구성의 시각 리듬을 반영하고 tablet/mobile은 2열/1열로 재배치합니다.

## 5. 공통 프로젝트 팝업

- 페이지당 모달 1개만 렌더링합니다.
- 카드 버튼이 data attribute 또는 JSON script로 프로젝트 데이터를 전달합니다.
- `role="dialog"`, `aria-modal="true"`, 닫기 버튼, ESC 닫기, focus trap, 원래 카드로 focus 복귀를 구현합니다.
- 데스크톱/모바일 긴 이미지는 overflow hidden viewport에서 top → bottom으로 자동 이동합니다.
- 모달이 열렸고 브라우저 탭이 보일 때만 실행하며 hover/focus, `visibilitychange`, reduced motion, 닫기에서 정지합니다.

## 6. 인터랙션과 반응형

| 기능 | 구현 | 모바일/대체 상태 |
| --- | --- | --- |
| Hero Portfolio | anchor smooth scroll | 일반 링크 |
| Portfolio 탭 | ARIA tab + JS | 가로 스크롤 탭 |
| 서비스 아코디언 | button/panel + CSS transition | 동일 동작 |
| Process | IntersectionObserver + 버튼 | 버튼 우선 |
| Universe | CSS transform / requestAnimationFrame | 정적 클러스터 |
| Portfolio 갤러리 | active class + grid transition | 탭으로 선택 |
| Service stack | `position: sticky` + z-index | 일반 세로 카드 |
| 긴 이미지 미리보기 | 모달 내 JS 제어 | 정적 첫 화면 |

## 7. QA

1. 1440, 1200, 1024, 768, 480, 375px에서 확인합니다.
2. 모든 CTA, 탭, 아코디언, 모달은 키보드로 조작합니다.
3. `prefers-reduced-motion`에서 궤도/자동 스크롤/진행 애니메이션을 정지합니다.
4. 이미지는 Theme Editor에서 수정 가능한 alt text를 둡니다.
5. Hero와 모든 큰 제목은 모바일에서 잘리지 않아야 합니다.
6. Theme Check 오류 없이 preview theme에서 문의 전송과 카카오 링크를 검수합니다.
