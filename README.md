# 台灣海外債券平台成本比較

可直接部署到 GitHub Pages 的純靜態網站。

## 上線方式
1. 將此資料夾所有檔案上傳到 GitHub repository 根目錄。
2. GitHub → Settings → Pages。
3. Source 選 `Deploy from a branch`。
4. Branch 選 `main` / `(root)`。
5. 儲存後即可取得 GitHub Pages 網址。

## 定期更新
`.github/workflows/check-fee-pages.yml` 每週一 09:15（台北時間）執行。
它會檢查 11 家官方來源頁內容是否與上週不同，並更新：
`data/source_status.json`

網站如果偵測到來源頁內容變動，會顯示「來源有變動」。

### 為什麼不直接自動改費率？
銀行/券商網站的文字與 HTML 結構會變動，而且費率可能有條件、例外、活動期間。
因此 v1 採「自動監測變動 + 人工確認費率」較安全，不會因爬蟲誤判自動發布錯誤金融資訊。

## 更新費率
修改 `data/fees.json` 即可；前端會自動載入。


## 比較模式
網站現在可切換：
- 總成本
- 申購費
- 賣出費
- 持有費
- 內含費用

「內含費用」只比較官方揭露的上限與透明度，不把上限當成實際成交費率。


## V3 導覽
- `index.html`：恢復 V1 風格首頁（總成本試算）
- `compare.html`：五種比較模式
- `master.html`：11 家收費總表
