# KosetsuGallery 規格與回歸檢查

本文件用來記錄目前站點的關鍵規格、資料結構、工具腳本與回歸測試清單，避免未來擴展時改 A 壞 B（也方便 AI 重新接上脈絡）。

## 1) 站點概覽

### 頁面
- `index.html`：首頁
- `about.html`：關於
- `gallery.html`：服裝型錄（漢服/和服分流 + tags 篩選 + Lightbox）
- `services.html`：服務方案（點擊方案 → 懸浮彈窗成品展示集 + Lightbox）
- `contact.html`：預約諮詢
- `plans/<plan>/`：每個方案一個資料夾，圖片與 `data.js` 放這裡（供 `services.html` 彈窗載入）

### 核心 JS（入口與版本）
- `js/version.js`：全站版本號（唯一需要手動更新的版本位置）
- `js/boot.js`：全站載入器（動態載入各頁所需的 JS，並對 `css/style.css` 追加 `?v=...`）
- `js/main.js`：注入 navbar/footer + active link + 手機窄寬導覽字縮短（<430）

## 2) 快取刷新（版本號）

### 目的
避免瀏覽器/CDN 快取導致更新後仍載入舊的 `css/js/data.js`。

### 作法
- 唯一版本來源：`js/version.js` 的 `SITE_VERSION`（格式：日期 8 碼 + 2 位序號，例如 `2025121901`）
- `js/boot.js` 會自動：
  - 將頁面中 `css/style.css` 改為 `css/style.css?v=<SITE_VERSION>`
  - 依頁面動態載入 `js/main.js`、`js/gallery.js`、`js/services-showcase.js` 等，且帶上 `?v=<SITE_VERSION>`
- `js/gallery.js` 對 `js/data.js` 使用動態 import，並帶版本號
- `js/services-showcase.js` 對各方案 `plans/<plan>/data.js` 使用動態 import，並帶版本號

### 更新流程
1. 修改 `js/version.js`：例如 `export const SITE_VERSION = '2025121902';`
2. 重新整理頁面（建議用無痕或清除 cache 驗證一次）

## 3) 導覽列（Header / Navbar）

### 行為
- Navbar/footer 由 `js/main.js` 在 runtime 注入至每頁 body。
- 小於 430px 時，導覽文字縮短：
  - 關於我們 → 關於
  - 服裝型錄 → 型錄
  - 服務方案 → 方案
  - 預約諮詢 → 諮詢

### 注意
- 由於 `js/boot.js` 使用動態 import 載入 `js/main.js`，因此 `js/main.js` 必須支援「DOM 已 ready 也能初始化」；目前已改為 `document.readyState` 判斷。

## 4) 服裝型錄（`gallery.html` + `js/gallery.js`）

### 入口分流
- 進入 `gallery.html` 先顯示 2 個分類卡：
  - 漢服：封面 `img/ig_photo_06.jpeg`
  - 和服：封面 `img/ig_photo_05.jpeg`
- 點選分類後才顯示原本功能：
  - tags 篩選列
  - 圖片 grid
  - Lightbox（放大、左右切換、ESC 關閉）

### URL 狀態
- 支援：
  - `gallery.html?category=hanfu`
  - `gallery.html?category=kimono`
- `popstate` 會同步回復 UI 狀態（返回鍵可用）

### 分類判斷（重要）
主要依賴 `tags` 內的「明確分類 tag」：
- 漢服：包含 `漢服`
- 和服：包含 `和服`

後備（推斷分類）：
- 若圖片「沒有任何明確分類 tag（漢服/和服）」才會啟用推斷：
  - 漢服推斷 tag：`戰國袍/漢/唐/宋/明/漢元素`
  - 和服推斷 tag：`振袖/訪問着/訪問/浴衣/小紋/袴/打掛`

這是為了解決「新增資料忘記填 漢服/和服 tag」導致分類看不到的問題。

### tags 排序（漢服）
漢服分類的 tags 顯示排序：
1. 純數字 tag（例如 600/800/1200/1500）依數值由小到大
2. 接著依序：`戰國袍 → 漢 → 唐 → 宋 → 明 → 其他`
3. 其餘 tags 再做中文排序

### 圖片排序（依 `order`）
型錄圖片顯示順序依 `data.js` 的 `order` 由小到大；無/不合法 `order` 會排最後且保留原始順序。

### 手機 RWD：tag 列
- 手機（<=720px）tag 篩選列改為單行橫向滑動，避免換行太多擋住圖庫
- 「← 分類」按鈕在手機上使用 sticky 固定於最左，且使用金色樣式與其他 tags 區隔

### 回到最上方
- 右下角浮動按鈕 `#toTop`：滾動超過一定高度顯示，點擊 smooth scroll 回頂

## 5) 服務方案（`services.html` + `js/services-showcase.js`）

### 行為
- 點擊任一方案卡片：開啟「懸浮彈窗」顯示該方案成品縮圖 grid
- 點擊縮圖：開啟 Lightbox（放大、左右切換、ESC 關閉）
- 關閉方式：
  - 點擊彈窗背景
  - 右上角 ×
  - ESC（若 Lightbox 開啟優先關 Lightbox）

### 方案資料夾結構（每個 plan 獨立）
每個方案一個資料夾，例如：
- `plans/hanfu-classic/`
  - `data.js`
  - `full/`（大圖原檔）
  - `thumbs/`（縮圖 webp）

`plans/<plan>/data.js` 內容範例：
```js
export const TITLE = '單人漢服經典方案';
export const SUBTITLE = '成品展示集';
export const IMAGES = [
  { thumb: './thumbs/001-xxx.webp', full: './full/001-xxx.jpg', alt: '', order: 1 },
];
```

### 路徑規則
- 在 `data.js` 中建議使用相對於方案資料夾的路徑：
  - `./thumbs/...`
  - `./full/...`
- `js/services-showcase.js` 會自動把它解析為 `plans/<plan>/thumbs/...` 與 `plans/<plan>/full/...`

## 6) 工具腳本：方案成品資料生成

### `tools/build_plan_showcase.py`
用途：針對 `plans/<plan>/full/` 內的圖片做三件事：
1. 重新命名為路徑安全檔名（ASCII、lowercase、加序號）
2. 產生 `plans/<plan>/thumbs/` 的方形 webp 縮圖
3. 生成 `plans/<plan>/data.js`（含 `order` 與 thumb/full 路徑）

指令：
- 單一方案：`python tools/build_plan_showcase.py plans/hanfu-classic`
- 全部方案：`python tools/build_plan_showcase.py --all`
- 先預覽不寫：`python tools/build_plan_showcase.py --all --dry-run`

縮圖參數：
- `--thumb-size 600`
- `--thumb-center-y 0.35`（越小越偏上，較不易切到人臉）
- `--webp-quality 82`

## 7) 變更歷程（摘要）

1. 型錄頁加入分類入口（漢服/和服）並以 `tags` 分流
2. 型錄 tags 與圖片排序規則（漢服 tags 特殊排序 + `order` 排序）
3. 手機 tag 列改為橫向滑動，「← 分類」sticky 固定並改色
4. 加入右下角回頂按鈕（改為 SVG 箭頭 + 動畫）
5. 服務方案改為彈窗展示成品（每方案獨立資料夾）
6. 新增 build 腳本自動命名/縮圖/生成 `data.js`
7. 引入 `js/version.js` + `js/boot.js` 做全站統一 cache bust（只改一個版本號）
8. 修正動態 import 後 DOMContentLoaded 已觸發導致 header/事件不生效：`main.js`/`gallery.js`/`services-showcase.js` 均改為支援 DOM ready 狀態直接初始化

## 8) 回歸測試清單（手動）

### A. 全站共通
- [ ] 任一頁面開啟都有 navbar + footer（`js/main.js` 注入成功）
- [ ] navbar 目前頁面 active 高亮正確
- [ ] 寬度 < 430px：navbar 文案縮短為「關於/型錄/方案/諮詢」
- [ ] 修改 `js/version.js` 的版本號後，刷新能看到新資源（避免 cache 卡住）

### B. 型錄（`gallery.html`）
- [ ] 進入先看到「漢服/和服」兩卡，不直接顯示 tags 與 grid
- [ ] 點漢服：顯示 tags 與 grid；點「← 分類」回入口
- [ ] 點和服：同上
- [ ] URL `?category=hanfu|kimono` 可直接進分類，返回鍵能回到入口
- [ ] tags 篩選：點某 tag 顯示正確子集；再點同 tag 會回到全部
- [ ] 漢服 tags 排序：數字由小到大，接著「戰國袍/漢/唐/宋/明/其他」，其餘再排序
- [ ] 圖片排序：依 `order` 由小到大
- [ ] 手機（<=720px）：tag 列為橫向滑動，不會擋住太多內容；「← 分類」保持在最左
- [ ] Lightbox：點任意圖可放大，左右切換可用，ESC/點背景可關
- [ ] 右下角回頂按鈕：滑下出現，點擊回頂

### C. 服務方案（`services.html`）
- [ ] 點任一方案卡片會開彈窗（不換頁）
- [ ] 彈窗內縮圖 grid 正常顯示；若無資料顯示「尚未加入此方案的成品圖片。」
- [ ] 點縮圖開 Lightbox；左右切換/ESC/關閉可用
- [ ] ESC：若 Lightbox 開啟優先關 Lightbox，否則關彈窗

### D. 方案資料（`plans/<plan>/`）
- [ ] `python tools/build_plan_showcase.py --all --dry-run` 能列出預計 rename
- [ ] 執行腳本後：
  - [ ] `full/` 圖片檔名變成安全格式 + 001/002... 序號
  - [ ] `thumbs/` 生成對應 webp
  - [ ] `data.js` 生成且內容路徑正確（`./full/...`、`./thumbs/...`、`order`）
- [ ] `services.html` 彈窗可成功載入該方案 `data.js` 並顯示縮圖

## 9) 常見踩坑
- 若新增圖片只填「明/宋/1200...」但忘了填「漢服/和服」：目前有推斷規則，但仍建議補上明確 tag，避免誤判。
- 動態 import 的腳本若只用 `DOMContentLoaded` 綁定事件，可能在 `boot.js` 模式下失效；請用 `document.readyState` 或直接執行初始化函式。
