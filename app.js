var KEY = "hesap-takip-v2";
var KATEGORILER = ["Market", "Yemek", "Fatura", "Ulaşım", "Eğlence", "Diğer", "Birikim"];
var GUNLER = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"];
var durum = { baslangic: 0, planlar: [], hareketler: [] };
var tur = "gider";
var donem = "ay";

function $(id) { return document.getElementById(id); }
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function para(n) { return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " ₺"; }
function p2(n) { return n < 10 ? "0" + n : "" + n; }
function tarihStr(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
function bugun() { return tarihStr(new Date()); }
function yeniId() { return Date.now() + "" + Math.floor(Math.random() * 1000); }

/* ---- Kayıt ---- */
function yukle() {
  try {
    var v2 = localStorage.getItem(KEY);
    if (v2) { durum = JSON.parse(v2); return; }
    var v1 = localStorage.getItem("hesap-takip-v1");
    if (v1) {
      var eski = JSON.parse(v1);
      durum.baslangic = eski.bakiye || 0;
      (eski.giderler || []).forEach(function (g) {
        var plan = { id: yeniId(), ad: g.ad, tutar: g.tutar, odendi: !!g.odendi };
        durum.planlar.push(plan);
        if (g.odendi) {
          durum.hareketler.push({ id: yeniId(), tur: "gider", ad: g.ad, tutar: g.tutar,
            kat: "Diğer", tarih: bugun(), planId: plan.id });
        }
      });
      kaydet();
    }
  } catch (e) {}
}
function kaydet() {
  try { localStorage.setItem(KEY, JSON.stringify(durum)); } catch (e) {}
}

/* ---- Hesaplar ---- */
function giderToplam(liste) {
  return liste.reduce(function (a, h) { return h.tur === "gider" ? a + h.tutar : a; }, 0);
}
function bakiyeHesapla() {
  var s = durum.baslangic;
  durum.hareketler.forEach(function (h) { s += h.tur === "gelir" ? h.tutar : -h.tutar; });
  return s;
}

/* ---- Çizim ---- */
function cizOzet() {
  var simdi = bakiyeHesapla();
  var bekleyen = durum.planlar.reduce(function (a, p) { return p.odendi ? a : a + p.tutar; }, 0);
  var kalan = simdi - bekleyen;
  $("simdi").textContent = para(simdi);
  $("planlanan").textContent = para(bekleyen);
  $("kalan").textContent = para(kalan);
  $("kalan").className = kalan < 0 ? "eksi" : "arti";
  $("uyari").hidden = kalan >= 0;
  $("uyari").textContent = "Para yetmiyor, " + para(-kalan) + " eksik kalıyor.";

  var b = bugun(), ay = b.slice(0, 7);
  var bugunG = giderToplam(durum.hareketler.filter(function (h) { return h.tarih === b; }));
  var ayG = giderToplam(durum.hareketler.filter(function (h) { return h.tarih.slice(0, 7) === ay; }));
  $("bugunGider").textContent = para(bugunG);
  $("ayGider").textContent = para(ayG);
  $("gunOrt").textContent = para(ayG / new Date().getDate());
  var gecen = new Date(); gecen.setMonth(gecen.getMonth() - 1, 1);
  var gecenAy = tarihStr(gecen).slice(0, 7);
  var gecenG = giderToplam(durum.hareketler.filter(function (h) { return h.tarih.slice(0, 7) === gecenAy; }));
  $("karsilastirma").textContent = gecenG ? "Geçen ay toplam " + para(gecenG) + " harcadın." : "";
}

function haftaBasi() {
  var d = new Date();
  var fark = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - fark);
  return tarihStr(d);
}

function cizGelir() {
  var kutu = $("gelirIcerik");
  kutu.innerHTML = "";
  var g = durum.gelir;
  if (!g) {
    kutu.appendChild(el("div", "bos", "Gelirini girmedin."));
    $("gelirDegistir").textContent = "Gir";
    return;
  }
  $("gelirDegistir").textContent = "Değiştir";
  var haftalik = g.donem === "hafta";
  $("gelirBaslik").textContent = haftalik ? "Haftalık gelirim" : "Aylık gelirim";
  var basla = haftalik ? haftaBasi() : bugun().slice(0, 7) + "-01";
  var harcanan = giderToplam(durum.hareketler.filter(function (h) { return h.tarih >= basla; }));
  var kalan = g.tutar - harcanan;
  var n = new Date();
  var gunKalan = haftalik ? 7 - ((n.getDay() + 6) % 7)
    : new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate() - n.getDate() + 1;
  var satirlar = [
    ["Gelir", para(g.tutar), ""],
    [haftalik ? "Bu hafta harcanan" : "Bu ay harcanan", para(harcanan), ""],
    ["Dönem sonuna kalan", para(kalan), kalan < 0 ? " eksi" : " arti"],
    ["Bugün en fazla", para(Math.max(0, kalan) / gunKalan), ""]
  ];
  satirlar.forEach(function (s) {
    var r = el("div", "gelir-satir" + s[2]);
    r.append(el("span", "", s[0]), el("b", "", s[1]));
    kutu.appendChild(r);
  });
}

function cizGrafik() {
  var kutu = $("grafik");
  kutu.innerHTML = "";
  var gunler = [], max = 1, i;
  for (i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var t = tarihStr(d);
    var top = giderToplam(durum.hareketler.filter(function (h) { return h.tarih === t; }));
    gunler.push({ ad: GUNLER[d.getDay()], top: top, bugun: i === 0 });
    if (top > max) max = top;
  }
  gunler.forEach(function (g) {
    var s = el("div", "sutun");
    var c = el("div", "cubuk" + (g.bugun ? " bugun" : ""));
    c.style.height = Math.round((g.top / max) * 90) + "%";
    s.append(c, el("span", "", g.ad));
    s.title = para(g.top);
    kutu.appendChild(s);
  });
}

function cizKategori() {
  var kutu = $("kategoriler");
  kutu.innerHTML = "";
  var ay = bugun().slice(0, 7), top = {};
  durum.hareketler.forEach(function (h) {
    if (h.tur === "gider" && h.tarih.slice(0, 7) === ay) top[h.kat] = (top[h.kat] || 0) + h.tutar;
  });
  var enCok = Math.max.apply(null, KATEGORILER.map(function (k) { return top[k] || 0; }).concat(1));
  KATEGORILER.forEach(function (k) {
    var harcanan = top[k] || 0, lim = durum.limitler[k];
    var satir = el("div", "kat");
    satir.onclick = function () {
      var v = prompt(k + " için aylık limit (₺). Kaldırmak için boş bırak:", lim || "");
      if (v === null) return;
      var n = parseFloat(v);
      if (n > 0) durum.limitler[k] = n; else delete durum.limitler[k];
      kaydet(); cizKategori();
    };
    var ust = el("div", "ust");
    ust.append(el("span", "", k), el("span", "", para(harcanan) + (lim ? " / " + para(lim) : "")));
    var yol = el("div", "yol"), d = el("div", "dolgu" + (lim && harcanan > lim ? " asildi" : ""));
    d.style.width = Math.min(100, Math.round((lim ? harcanan / lim : harcanan / enCok) * 100)) + "%";
    yol.appendChild(d);
    satir.append(ust, yol);
    kutu.appendChild(satir);
  });
}

function cizHedef() {
  var h = durum.hedef, k = $("hedefIcerik");
  k.innerHTML = "";
  $("hedefEkle").hidden = !h;
  $("hedefBtn").textContent = h ? "Değiştir" : "Hedef koy";
  if (!h) { k.appendChild(el("div", "bos", "Bir birikim hedefi koy.")); return; }
  var u = el("div", "gelir-satir");
  u.append(el("span", "", h.ad), el("b", "", para(h.biriken) + " / " + para(h.tutar)));
  var yol = el("div", "yol"), d = el("div", "dolgu");
  d.style.width = Math.min(100, Math.round(h.biriken / h.tutar * 100)) + "%";
  yol.appendChild(d);
  k.append(u, yol);
}

function cizTekrar() {
  var l = $("tekrarListe");
  l.innerHTML = "";
  durum.tekrar.forEach(function (t, i) {
    var li = el("li"), s = el("button", "sil", "Sil");
    s.onclick = function () { durum.tekrar.splice(i, 1); kaydet(); cizTekrar(); };
    li.append(el("span", "ad", t.ad + " · her ayın " + t.gun + ". günü"),
      el("span", t.tur === "gelir" ? "gelir" : "", (t.tur === "gelir" ? "+" : "−") + para(t.tutar)), s);
    l.appendChild(li);
  });
}

function tekrarUygula() {
  var d = new Date(), ay = tarihStr(d).slice(0, 7), degisti = false;
  durum.tekrar.forEach(function (t) {
    var k = t.id + "-" + ay;
    if (!durum.uygulanan[k] && d.getDate() >= t.gun) {
      durum.uygulanan[k] = 1; degisti = true;
      durum.hareketler.push({ id: yeniId(), tur: t.tur, ad: t.ad, tutar: t.tutar,
        kat: t.tur === "gelir" ? "Gelir" : "Diğer", tarih: ay + "-" + p2(t.gun) });
    }
  });
  if (degisti) kaydet();
}

function varsayilan() {
  durum.limitler = durum.limitler || {};
  durum.tekrar = durum.tekrar || [];
  durum.uygulanan = durum.uygulanan || {};
}

function cizPlanlar() {
  var liste = $("planListe");
  liste.innerHTML = "";
  if (!durum.planlar.length) liste.appendChild(el("div", "bos", "Henüz plan yok. Yukarıdan ekle."));
  durum.planlar.forEach(function (p, i) {
    var li = el("li", p.odendi ? "odendi" : "");
    var cb = el("input");
    cb.type = "checkbox";
    cb.checked = p.odendi;
    cb.setAttribute("aria-label", p.ad + " ödendi");
    cb.onchange = function () {
      p.odendi = cb.checked;
      if (p.odendi) {
        durum.hareketler.push({ id: yeniId(), tur: "gider", ad: p.ad, tutar: p.tutar,
          kat: "Diğer", tarih: bugun(), planId: p.id });
      } else {
        durum.hareketler = durum.hareketler.filter(function (h) { return h.planId !== p.id; });
      }
      kaydet(); ciz();
    };
    var sil = el("button", "sil", "Sil");
    sil.onclick = function () { durum.planlar.splice(i, 1); kaydet(); ciz(); };
    li.append(cb, el("span", "ad", p.ad), el("span", "", para(p.tutar)), sil);
    liste.appendChild(li);
  });
}

function cizGecmis() {
  var kutu = $("gecmisListe");
  kutu.innerHTML = "";
  if (!durum.hareketler.length) {
    kutu.appendChild(el("div", "bos", "Geçmiş boş. Hesap sekmesinden gider ya da gelir ekle."));
    return;
  }
  var sirali = durum.hareketler.filter(function (h) {
    var q = $("ara").value.trim().toLowerCase();
    return !q || (h.ad + " " + h.kat + " " + h.tarih).toLowerCase().indexOf(q) > -1;
  }).sort(function (a, b) {
    return a.tarih === b.tarih ? (a.id < b.id ? 1 : -1) : (a.tarih < b.tarih ? 1 : -1);
  });
  var gruplar = {}, sira = [];
  sirali.forEach(function (h) {
    if (!gruplar[h.tarih]) { gruplar[h.tarih] = []; sira.push(h.tarih); }
    gruplar[h.tarih].push(h);
  });
  sira.forEach(function (t) {
    var p = t.split("-");
    var adi = new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("tr-TR",
      { day: "numeric", month: "long", weekday: "long" });
    var kart = el("div", "gun");
    var baslik = el("div", "baslik");
    baslik.append(el("span", "", adi), el("span", "", "−" + para(giderToplam(gruplar[t]))));
    kart.appendChild(baslik);
    gruplar[t].forEach(function (h) {
      var satir = el("div", "hareket");
      var ad = el("span", "ad", h.ad);
      ad.appendChild(el("span", "kat-etiket", h.kat));
      var tutar = el("span", h.tur === "gelir" ? "gelir" : "",
        (h.tur === "gelir" ? "+" : "−") + para(h.tutar));
      var sil = el("button", "sil", "Sil");
      sil.onclick = function () {
        durum.hareketler = durum.hareketler.filter(function (x) { return x.id !== h.id; });
        if (h.planId) {
          durum.planlar.forEach(function (pl) { if (pl.id === h.planId) pl.odendi = false; });
        }
        kaydet(); ciz();
      };
      satir.append(ad, tutar, sil);
      kart.appendChild(satir);
    });
    kutu.appendChild(kart);
  });
}

function ciz() { cizOzet(); cizGelir(); cizGrafik(); cizKategori(); cizHedef(); cizTekrar(); cizPlanlar(); cizGecmis(); }

/* ---- Olaylar ---- */
document.querySelectorAll(".sekmeler button").forEach(function (b) {
  b.onclick = function () {
    document.querySelectorAll(".sekmeler button").forEach(function (x) { x.classList.remove("aktif"); });
    b.classList.add("aktif");
    document.querySelectorAll(".sekme").forEach(function (s) { s.hidden = s.id !== b.dataset.sekme; });
  };
});

function turSec(t) {
  tur = t;
  $("turGider").className = t === "gider" ? "aktif gider" : "";
  $("turGelir").className = t === "gelir" ? "aktif" : "";
  $("hKat").hidden = t === "gelir";
}
$("turGider").onclick = function () { turSec("gider"); };
$("turGelir").onclick = function () { turSec("gelir"); };

KATEGORILER.forEach(function (k) {
  var o = el("option", "", k); o.value = k; $("hKat").appendChild(o);
});
$("hTarih").value = bugun();

$("hEkle").onclick = function () {
  var ad = $("hAd").value.trim(), t = parseFloat($("hTutar").value);
  if (!ad || !(t > 0)) return;
  durum.hareketler.push({ id: yeniId(), tur: tur, ad: ad, tutar: t,
    kat: tur === "gelir" ? "Gelir" : $("hKat").value, tarih: $("hTarih").value || bugun() });
  $("hAd").value = ""; $("hTutar").value = "";
  kaydet(); ciz();
};

$("pEkle").onclick = function () {
  var ad = $("pAd").value.trim(), t = parseFloat($("pTutar").value);
  if (!ad || !(t > 0)) return;
  durum.planlar.push({ id: yeniId(), ad: ad, tutar: t, odendi: false });
  $("pAd").value = ""; $("pTutar").value = "";
  kaydet(); ciz();
};

$("baslangic").oninput = function () {
  durum.baslangic = parseFloat($("baslangic").value) || 0;
  kaydet(); ciz();
};

function donemSec(d) {
  donem = d;
  $("donemHafta").className = d === "hafta" ? "aktif" : "";
  $("donemAy").className = d === "ay" ? "aktif" : "";
}
function gelirSor() {
  donemSec(durum.gelir ? durum.gelir.donem : "ay");
  $("gelirTutar").value = durum.gelir ? durum.gelir.tutar : "";
  $("gelirModal").hidden = false;
  $("gelirTutar").focus();
}
$("donemHafta").onclick = function () { donemSec("hafta"); };
$("donemAy").onclick = function () { donemSec("ay"); };
$("gelirKaydet").onclick = function () {
  var t = parseFloat($("gelirTutar").value);
  if (!(t > 0)) return;
  durum.gelir = { donem: donem, tutar: t };
  durum.gelirSorduldu = true;
  kaydet(); $("gelirModal").hidden = true; ciz();
};
$("gelirGec").onclick = function () {
  durum.gelirSorduldu = true;
  kaydet(); $("gelirModal").hidden = true;
};
$("gelirDegistir").onclick = gelirSor;

yukle();
varsayilan();
tekrarUygula();
$("baslangic").value = durum.baslangic || "";
turSec("gider");
ciz();
if (!durum.gelir && !durum.gelirSorduldu) gelirSor();

/* ---- Hedef, tekrar, arama, yedek, PIN ---- */
$("hedefBtn").onclick = function () {
  var ad = prompt("Ne için biriktiriyorsun?", durum.hedef ? durum.hedef.ad : "");
  if (!ad) return;
  var t = parseFloat(prompt("Hedef tutar (₺):", durum.hedef ? durum.hedef.tutar : ""));
  if (!(t > 0)) return;
  durum.hedef = { ad: ad, tutar: t, biriken: durum.hedef ? durum.hedef.biriken : 0 };
  kaydet(); ciz();
};
$("hedefEkle").onclick = function () {
  var t = parseFloat(prompt("Birikime ne kadar ekliyorsun? (₺)"));
  if (!(t > 0) || !durum.hedef) return;
  durum.hedef.biriken += t;
  durum.hareketler.push({ id: yeniId(), tur: "gider", ad: "Birikim: " + durum.hedef.ad,
    tutar: t, kat: "Birikim", tarih: bugun() });
  kaydet(); ciz();
};
$("tEkle").onclick = function () {
  var ad = $("tAd").value.trim(), t = parseFloat($("tTutar").value), g = parseInt($("tGun").value, 10);
  if (!ad || !(t > 0) || !(g >= 1 && g <= 28)) return;
  var o = { id: yeniId(), ad: ad, tutar: t, gun: g, tur: $("tTur").value };
  durum.tekrar.push(o);
  if (g < new Date().getDate()) durum.uygulanan[o.id + "-" + bugun().slice(0, 7)] = 1;
  $("tAd").value = ""; $("tTutar").value = ""; $("tGun").value = "";
  tekrarUygula(); kaydet(); ciz();
};
$("ara").oninput = cizGecmis;

$("yedekle").onclick = function () {
  var b = new Blob([JSON.stringify(durum)], { type: "application/json" });
  var a = el("a");
  a.href = URL.createObjectURL(b);
  a.download = "hesabim-yedek-" + bugun() + ".json";
  a.click();
};
$("geriYukle").onchange = function (e) {
  var f = e.target.files[0];
  if (!f) return;
  var r = new FileReader();
  r.onload = function () {
    try {
      var v = JSON.parse(r.result);
      if (!Array.isArray(v.hareketler)) throw 0;
      durum = v; varsayilan(); kaydet();
      $("baslangic").value = durum.baslangic || "";
      ciz();
      $("ayarDurum").textContent = "Yedek yüklendi.";
    } catch (x) { $("ayarDurum").textContent = "Bu dosya geçerli bir yedek değil."; }
  };
  r.readAsText(f);
};

$("pinKaydet").onclick = function () {
  var v = $("pinGiris").value;
  if (!/^\d{4}$/.test(v)) { $("ayarDurum").textContent = "PIN 4 rakam olmalı."; return; }
  durum.pin = v; kaydet(); $("pinGiris").value = "";
  $("ayarDurum").textContent = "PIN kaydedildi.";
};
$("pinKaldir").onclick = function () {
  delete durum.pin; kaydet();
  $("ayarDurum").textContent = "PIN kaldırıldı.";
};
$("kilitGiris").oninput = function () {
  if (this.value === durum.pin) { this.value = ""; $("kilit").hidden = true; }
};
if (durum.pin) $("kilit").hidden = false;
