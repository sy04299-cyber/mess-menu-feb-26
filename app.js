async function loadMenu(){
  const res = await fetch('menu.json');
  if(!res.ok) throw new Error('menu.json not found');
  const data = await res.json();
  // data is { service_instructions: "...", entries: [ ... ] }
  data.entries.sort((a,b)=>a.date.localeCompare(b.date));
  return data;
}

function formatDateISO(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

function detectVegNonVeg(item){
  const nvKeywords = ['chicken','mutton','egg','fish','prawn','prawns','butter chicken','chettinad chicken','chicken 65','chicken gravy','chicken dum','chettinad'];
  const lower = item.toLowerCase();
  for(const k of nvKeywords) if(lower.includes(k)) return 'nv';
  return 'veg';
}

function renderMealList(items){
  return items.split(/;|\n/).map(i=>i.trim()).filter(Boolean).map(it=>{
    const type = detectVegNonVeg(it);
    const tag = type==='nv' ? `<span class="tag tag-nv">Non‑Veg</span>` : `<span class="tag tag-veg">Veg</span>`;
    return `<li>${it} ${tag}</li>`;
  }).join('');
}

function renderDay(entry, mealChecks){
  const el = document.createElement('div');
  el.className = 'card card-day';
  el.innerHTML = `<h3>${entry.day} — ${entry.date} ${entry.is_special?'<span class="badge">Special</span>':''}</h3>`;
  for(const m of ['breakfast','lunch','snacks','dinner']){
    const items = entry.meals[m];
    if(!items) continue;
    const section = document.createElement('div');
    section.innerHTML = `<div class="meal-title">${m.charAt(0).toUpperCase()+m.slice(1)}</div>
      <ul class="meal-list">${renderMealList(items)}</ul>`;
    el.appendChild(section);
  }
  if(entry.notes){
    const notes = document.createElement('div');
    notes.className = 'notes';
    notes.innerHTML = `<strong>Notes:</strong> ${entry.notes}`;
    el.appendChild(notes);
  }
  return el;
}

function applyFilters(data){
  const dateVal = document.getElementById('datePicker').value;
  const q = document.getElementById('search').value.trim().toLowerCase();
  const specialOnly = document.getElementById('specialOnly').checked;
  const mealChecks = Array.from(document.querySelectorAll('#filters input[type=checkbox][data-meal]'))
    .filter(cb=>cb.checked).map(cb=>cb.dataset.meal);

  let filtered = data.entries.slice();
  if(dateVal) filtered = filtered.filter(d=>d.date===dateVal);
  if(specialOnly) filtered = filtered.filter(d=>d.is_special);

  if(q){
    filtered = filtered.filter(d=>{
      const inMeals = Object.values(d.meals).some(v=>v && v.toLowerCase().includes(q));
      const inNotes = (d.notes||'').toLowerCase().includes(q);
      return inMeals || inNotes;
    });
  }

  const container = document.getElementById('menuDisplay');
  container.innerHTML = '';
  if(filtered.length===0){
    container.innerHTML = '<div class="card">No menu found for the selected filters.</div>';
    return;
  }

  filtered.forEach(entry=>{
    const card = renderDay(entry, mealChecks);
    Array.from(card.querySelectorAll('.meal-title')).forEach(mt=>{
      const mealName = mt.textContent.toLowerCase();
      const mealKey = mealName.split(' ')[0];
      if(!mealChecks.includes(mealKey)) mt.parentElement.style.display='none';
    });
    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const data = await loadMenu();
  const datePicker = document.getElementById('datePicker');
  datePicker.min = data.entries[0].date;
  datePicker.max = data.entries[data.entries.length-1].date;

  const todayISO = formatDateISO(new Date());
  datePicker.value = (todayISO >= datePicker.min && todayISO <= datePicker.max) ? todayISO : data.entries[0].date;

  // populate service instructions
  document.getElementById('instructionsContent').innerText = data.service_instructions || '';

  applyFilters(data);

  document.getElementById('datePicker').addEventListener('change', ()=>applyFilters(data));
  document.getElementById('search').addEventListener('input', ()=>applyFilters(data));
  document.querySelectorAll('#filters input[type=checkbox]').forEach(cb=>cb.addEventListener('change', ()=>applyFilters(data)));
  document.getElementById('printBtn').addEventListener('click', ()=>window.print());
  document.getElementById('todayBtn').addEventListener('click', ()=>{
    datePicker.value = (todayISO >= datePicker.min && todayISO <= datePicker.max) ? todayISO : datePicker.min;
    applyFilters(data);
  });
  document.getElementById('showInstructionsBtn').addEventListener('click', ()=>{
    const sec = document.getElementById('serviceInstructions');
    sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
    sec.scrollIntoView({behavior:'smooth'});
  });
});
