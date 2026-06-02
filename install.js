(function () {
  const scriptUrl = new URL("./dentis-ocr-panel.js", location.href).href;
  const code = `javascript:(()=>{const s=document.createElement('script');s.src='${scriptUrl}?v=1';s.onload=()=>window.DentisOCR&&window.DentisOCR.open();document.head.appendChild(s);})()`;
  const link = document.getElementById("bookmarkletLink");
  const area = document.getElementById("bookmarkletCode");
  const copy = document.getElementById("copyBookmarklet");
  const open = document.getElementById("openPanelHere");

  if (link) link.href = code;
  if (area) area.value = code;
  if (copy) {
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(code);
      copy.textContent = "コピーしました";
      setTimeout(() => {
        copy.textContent = "コードをコピー";
      }, 1600);
    });
  }
  if (open) {
    open.addEventListener("click", () => window.DentisOCR.open());
  }
})();
