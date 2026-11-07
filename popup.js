const ids = ["enabled","target","dollar","yen"];
const ui = Object.fromEntries([...ids,"code","status"].map(id => [id, document.getElementById(id)]));
const names = new Intl.DisplayNames("zh-CN", { type:"currency" });
let latest;

function populate(id, codes, selected) {
  ui[id].replaceChildren(...codes.map(code => new Option(names.of(code) + " · " + code, code)));
  ui[id].value = selected;
}
function status() {
  ui.code.textContent = ui.target.value;
  if (!ui.enabled.checked) ui.status.textContent = "自动换算已暂停";
  else if (!latest) ui.status.textContent = "汇率暂不可用，请稍后重试";
  else ui.status.textContent = (Date.now() >= latest.expires ? "缓存汇率 " : "汇率更新 ") + new Date(latest.date).toLocaleDateString("zh-CN");
}
async function init() {
  const settings = await chrome.storage.local.get(Money.defaults);
  const common = ["CNY","USD","EUR","JPY","HKD","TWD","GBP","VND","KRW","AUD","CAD","SGD","CHF","THB","INR","NZD"];
  populate("target", [...new Set([...common,settings.target])], settings.target);
  populate("dollar", ["USD","HKD","CAD","AUD","NZD","SGD","TWD"], settings.dollar);
  populate("yen", ["CNY","JPY"], settings.yen);
  ui.enabled.checked = settings.enabled;
  ui.code.textContent = settings.target;
  ids.forEach(id => ui[id].addEventListener("change", async () => {
    await chrome.storage.local.set({ [id]:id === "enabled" ? ui.enabled.checked : ui[id].value });
    status();
  }));
  latest = await chrome.runtime.sendMessage("rates");
  if (latest) populate("target", [...new Set([...common,...Object.keys(latest.rates).sort()])], ui.target.value);
  status();
}
init();
