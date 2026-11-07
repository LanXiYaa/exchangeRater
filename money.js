const Money = (() => {
  const defaults = { enabled: true, target: "CNY", dollar: "USD", yen: "CNY" };
  const aliases = {
    "US$":"USD","HK$":"HKD","NT$":"TWD","CA$":"CAD","C$":"CAD","AU$":"AUD","A$":"AUD","NZ$":"NZD","S$":"SGD",
    "CN¥":"CNY","JP¥":"JPY","RMB":"CNY","人民币":"CNY","元人民币":"CNY","美元":"USD","美金":"USD","欧元":"EUR",
    "英镑":"GBP","港元":"HKD","港币":"HKD","新台币":"TWD","日元":"JPY","日圆":"JPY","韩元":"KRW","越南盾":"VND","元":"CNY",
    "€":"EUR","£":"GBP","₩":"KRW","₫":"VND","đ":"VND","₹":"INR","฿":"THB","₽":"RUB","₱":"PHP","₺":"TRY","₴":"UAH",
    "$":"dollar","¥":"yen","￥":"yen"
  };
  const codes = Intl.supportedValuesOf("currency");
  const escape = s => s.replace(/[.*+?^$()|[\]\\]/g, "\\\$&");
  const tokens = [...Object.keys(aliases), ...codes].sort((a,b) => b.length-a.length).map(escape).join("|");
  const number = "\\d+(?:[.,]\\d+|[ \\u00a0\\u202f']\\d{3}(?!\\d))*";
  const gap = "[ \\t\\u00a0\\u202f]*";
  const pattern = new RegExp("(?<![A-Za-z])([-−]?)" + gap + "(" + tokens + ")" + gap + "([-−]?)" + gap + "(" + number + ")(?![\\d.,]\\d)|(?<![\\d.,])([-−]?)(" + number + ")" + gap + "(" + tokens + ")(?![A-Za-z])", "gu");

  function parse(text, settings = defaults) {
    const result = [];
    for (const m of text.matchAll(pattern)) {
      const token = m[2] || m[7];
      let code = aliases[token] || token;
      code = settings[code] || code;
      let digits = (m[4] || m[6]).replace(/[ '\u00a0\u202f]/g, "");
      const last = Math.max(digits.lastIndexOf(","), digits.lastIndexOf("."));
      if (last >= 0) {
        const fraction = digits.slice(last + 1);
        const decimal = fraction.length <= 2 || (fraction.length === 3 && ["KWD","BHD","OMR","JOD","TND","IQD","LYD"].includes(code) && digits.indexOf(digits[last]) === last);
        digits = decimal ? digits.slice(0,last).replace(/[.,]/g,"") + "." + fraction : digits.replace(/[.,]/g,"");
      }
      const value = Number(digits) * (m[1] || m[3] || m[5] ? -1 : 1);
      if (Number.isFinite(value)) result.push({ code, value, label:m[0].trim() });
    }
    return result;
  }
  return { parse, defaults, codes };
})();
