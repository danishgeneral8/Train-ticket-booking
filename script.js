/* SkyRail booking script */

// configuration
var COACHES = 2;
var ROWS = 5;
var SEATS = 4;
var FARE = 1000;
var STORAGE_KEY = "skyrail_bookings_v1";

// DOM elements
var coachSelect = document.getElementById("coachSelect");
var seatMap = document.getElementById("seatMap");
var totalSeatsEl = document.getElementById("totalSeats");
var bookedSeatsEl = document.getElementById("bookedSeats");
var emptySeatsEl = document.getElementById("emptySeats");
var earningsEl = document.getElementById("earnings");
var bookedList = document.getElementById("bookedList");
var resetBtn = document.getElementById("resetBtn");
var downloadBtn = document.getElementById("downloadBtn");

var modal = document.getElementById("modal");
var modalClose = document.getElementById("modalClose");
var bookForm = document.getElementById("bookForm");
var fmCoach = document.getElementById("fmCoach");
var fmRow = document.getElementById("fmRow");
var fmSeat = document.getElementById("fmSeat");
var fmName = document.getElementById("fmName");
var fmAge = document.getElementById("fmAge");
var fmFrom = document.getElementById("fmFrom");
var fmTo = document.getElementById("fmTo");
var fmDate = document.getElementById("fmDate");
var cancelBtn = document.getElementById("cancelBtn");

var ticketPreview = document.getElementById("ticketPreview");
var tPnr = document.getElementById("tPnr");
var tName = document.getElementById("tName");
var tFrom = document.getElementById("tFrom");
var tTo = document.getElementById("tTo");
var tDate = document.getElementById("tDate");
var tCoach = document.getElementById("tCoach");
var tRow = document.getElementById("tRow");
var tSeat = document.getElementById("tSeat");
var tAge = document.getElementById("tAge");
var tFare = document.getElementById("tFare");
var closeTicket = document.getElementById("closeTicket");
var downloadTicket = document.getElementById("downloadTicket");

// data model
var bookings = createEmptyStructure();

// init
init();

function createEmptyStructure() {
  var arr = [];
  for (var c = 0; c < COACHES; c++) {
    var coach = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var s = 0; s < SEATS; s++) {
        row.push({ booked: false, name: "", age: 0, from: "", to: "", date: "", pnr: "", ts: null });
      }
      coach.push(row);
    }
    arr.push(coach);
  }
  return arr;
}

function init() {
  // fill coach select
  for (var i = 0; i < COACHES; i++) {
    var opt = document.createElement("option");
    opt.value = i;
    opt.textContent = "Coach " + (i + 1);
    coachSelect.appendChild(opt);
  }

  // load from storage
  loadFromStorage();

  // events
  coachSelect.addEventListener("change", function() { renderSeatMap(Number(coachSelect.value)); });
  resetBtn.addEventListener("click", resetAll);
  downloadBtn.addEventListener("click", downloadCSV);
  modalClose.addEventListener("click", hideModal);
  cancelBtn.addEventListener("click", hideModal);

  bookForm.addEventListener("submit", function(ev) {
    ev.preventDefault();
    var c = Number(fmCoach.value);
    var r = Number(fmRow.value);
    var s = Number(fmSeat.value);
    var name = fmName.value.trim();
    var age = Number(fmAge.value);
    var from = fmFrom.value.trim();
    var to = fmTo.value.trim();
    var date = fmDate.value.trim();

    if (!name || isNaN(age) || age < 0 || !from || !to || !date) {
      alert("Please fill all fields properly.");
      return;
    }

    // generate PNR and save
    var pnr = makePnr();
    bookings[c][r][s] = {
      booked: true,
      name: name,
      age: age,
      from: from,
      to: to,
      date: date,
      pnr: pnr,
      ts: Date.now()
    };

    saveToStorage();
    hideModal();
    renderSeatMap(c);
    renderSummary();
    showTicket(bookings[c][r][s], c, r, s);
  });

  // ticket controls
  closeTicket && closeTicket.addEventListener("click", hideTicket);
  downloadTicket && downloadTicket.addEventListener("click", downloadTicketRow);

  // initial render
  coachSelect.value = 0;
  renderSeatMap(0);
  renderSummary();
}

// small PNR generator (2 letters + 6 digits)
function makePnr() {
  var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var a = letters.charAt(Math.floor(Math.random() * 26));
  var b = letters.charAt(Math.floor(Math.random() * 26));
  var nums = "";
  for (var i = 0; i < 6; i++) nums += Math.floor(Math.random() * 10);
  return a + b + nums;
}

function renderSeatMap(coachIdx) {
  seatMap.innerHTML = "";
  for (var r = 0; r < ROWS; r++) {
    for (var s = 0; s < SEATS; s++) {
      var item = document.createElement("div");
      var dataObj = bookings[coachIdx][r][s];
      item.className = "seat " + (dataObj.booked ? "booked" : "available");
      item.dataset.coach = coachIdx;
      item.dataset.row = r;
      item.dataset.seat = s;

      var label = document.createElement("div");
      label.className = "label";
      label.textContent = "R" + (r + 1) + "S" + (s + 1);

      var meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = dataObj.booked ? dataObj.name : "Available";

      item.appendChild(label);
      item.appendChild(meta);

      (function(c, rr, ss) {
        item.addEventListener("click", function() { onSeatClicked(c, rr, ss); });
      })(coachIdx, r, s);

      seatMap.appendChild(item);
    }
  }
}

function onSeatClicked(c, r, s) {
  var seat = bookings[c][r][s];
  if (!seat.booked) {
    openModalFor(c, r, s);
  } else {
    var confirmCancel = confirm("Cancel booking for " + seat.name + " (PNR: " + seat.pnr + ")?");
    if (confirmCancel) {
      bookings[c][r][s] = { booked: false, name: "", age: 0, from: "", to: "", date: "", pnr: "", ts: null };
      saveToStorage();
      renderSeatMap(c);
      renderSummary();
      hideTicket();
      alert("Booking cancelled.");
    }
  }
}

function openModalFor(c, r, s) {
  fmCoach.value = c;
  fmRow.value = r;
  fmSeat.value = s;
  fmName.value = "";
  fmAge.value = "";
  fmFrom.value = "";
  fmTo.value = "";
  fmDate.value = "";
  document.getElementById("modalTitle").textContent = "Book — Coach " + (c+1) + " / Row " + (r+1) + " / Seat " + (s+1);
  showModal();
}

function showModal() { modal.classList.remove("hidden"); }
function hideModal() { modal.classList.add("hidden"); }

function renderSummary() {
  var total = COACHES * ROWS * SEATS;
  var bookedCount = 0;
  var list = [];

  for (var c = 0; c < COACHES; c++) {
    for (var r = 0; r < ROWS; r++) {
      for (var s = 0; s < SEATS; s++) {
        var obj = bookings[c][r][s];
        if (obj.booked) {
          bookedCount++;
          list.push({ c: c, r: r, s: s, name: obj.name, pnr: obj.pnr, from: obj.from, to: obj.to, date: obj.date });
        }
      }
    }
  }

  totalSeatsEl.textContent = total;
  bookedSeatsEl.textContent = bookedCount;
  emptySeatsEl.textContent = total - bookedCount;
  earningsEl.textContent = "Rs." + (bookedCount * FARE);

  bookedList.innerHTML = "";
  if (list.length === 0) {
    bookedList.innerHTML = '<div class="no-data">No bookings yet.</div>';
  } else {
    list.sort(function(a,b){ return a.c - b.c || a.r - b.r || a.s - b.s; });
    list.forEach(function(item) {
      var div = document.createElement("div");
      div.className = "booked-item";
      div.innerHTML = '<div class="left">Coach ' + (item.c+1) + ' Row ' + (item.r+1) + ' Seat ' + (item.s+1) + ' — <strong>' + escapeHtml(item.name) + '</strong><br><small style="color:#666">' + escapeHtml(item.from) + ' → ' + escapeHtml(item.to) + ' on ' + escapeHtml(item.date) + '</small></div>' +
                      '<div class="right">PNR ' + item.pnr + '</div>';
      bookedList.appendChild(div);
    });
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch (e) {
    console.warn("Could not save bookings.", e);
  }
}

function loadFromStorage() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === COACHES) {
      bookings = parsed;
    }
  } catch (e) {
    console.warn("Load failed", e);
  }
  renderSummary();
}

function resetAll() {
  if (!confirm("This will clear all saved bookings. Continue?")) return;
  bookings = createEmptyStructure();
  localStorage.removeItem(STORAGE_KEY);
  renderSeatMap(Number(coachSelect.value));
  renderSummary();
  hideTicket();
  alert("All data reset.");
}

function downloadCSV() {
  var rows = [["coach","row","seat","booked","name","age","from","to","date","pnr","timestamp"]];
  for (var c = 0; c < COACHES; c++) {
    for (var r = 0; r < ROWS; r++) {
      for (var s = 0; s < SEATS; s++) {
        var seat = bookings[c][r][s];
        rows.push([c+1, r+1, s+1, seat.booked ? 1 : 0, seat.name||"", seat.age||"", seat.from||"", seat.to||"", seat.date||"", seat.pnr||"", seat.ts||""]);
      }
    }
  }
  var csv = rows.map(function(rw){ return rw.map(function(cell){ return '"' + String(cell).replace(/"/g,'""') + '"'; }).join(","); }).join("\n");
  var blob = new Blob([csv], { type: "text/csv" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "skyrail_bookings.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showTicket(seatObj, c, r, s) {
  tPnr.textContent = seatObj.pnr;
  tName.textContent = seatObj.name;
  tFrom.textContent = seatObj.from;
  tTo.textContent = seatObj.to;
  tDate.textContent = seatObj.date;
  tCoach.textContent = c + 1;
  tRow.textContent = r + 1;
  tSeat.textContent = s + 1;
  tAge.textContent = seatObj.age;
  tFare.textContent = FARE;
  ticketPreview.classList.remove("hidden");
  ticketPreview.dataset.c = c;
  ticketPreview.dataset.r = r;
  ticketPreview.dataset.s = s;
}

function hideTicket() {
  ticketPreview.classList.add("hidden");
  ticketPreview.dataset.c = "";
  ticketPreview.dataset.r = "";
  ticketPreview.dataset.s = "";
}

function downloadTicketRow() {
  var c = Number(ticketPreview.dataset.c);
  if (isNaN(c)) return;
  var r = Number(ticketPreview.dataset.r);
  var s = Number(ticketPreview.dataset.s);
  var seat = bookings[c][r][s];
  var rows = [["coach","row","seat","booked","name","age","from","to","date","pnr","timestamp"],
              [c+1,r+1,s+1,seat.booked?1:0,seat.name||"",seat.age||"",seat.from||"",seat.to||"",seat.date||"",seat.pnr||"",seat.ts||""]];
  var csv = rows.map(function(rw){ return rw.map(function(cell){ return '"' + String(cell).replace(/"/g,'""') + '"'; }).join(","); }).join("\n");
  var blob = new Blob([csv], { type: "text/csv" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "skyrail_" + (seat.pnr || "ticket") + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function(ch) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]); });
}