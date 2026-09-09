export function easterDate(year){
  var a = year % 19;
  var b = Math.floor(year / 100);
  var c = year % 100;
  var d = Math.floor(b / 4);
  var e = b % 4;
  var f = Math.floor((b + 8) / 25);
  var g = Math.floor((b - f + 1) / 3);
  var h = (19 * a + b - d - g + 15) % 30;
  var i = Math.floor(c / 4);
  var k = c % 4;
  var l = (32 + 2 * e + 2 * i - h - k) % 7;
  var m = Math.floor((a + 11 * h + 22 * l) / 451);
  var month = Math.floor((h + l - 7 * m + 114) / 31);
  var day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function shifted(base, days){
  var d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function isBindingFastDay(date){
  var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getDay() === 5) return true;
  var easter = easterDate(d.getFullYear());
  var ash = shifted(easter, -46);
  var good = shifted(easter, -2);
  return d.getTime() === ash.getTime() || d.getTime() === good.getTime();
}