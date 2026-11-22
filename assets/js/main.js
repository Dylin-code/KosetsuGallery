// 網站前端入口：依頁面上的 data-component 掛載互動元件。
// admin 編輯層會 import 同一個 app，在局部重新整理後呼叫 app.mount() 重新掛載。
import { createApp } from './core/app.js';

export const app = createApp(document);
app.mount();
