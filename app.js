const FALLBACK_PRODUCTS = [
  { id:'fruit-box', name:'Fruit & Veg Box', category:'Boxes', price:28, emoji:'🥕', note:'Seasonal selection', stock:20 },
  { id:'salad', name:'Organic Salad', category:'Salads', price:4.5, emoji:'🥬', note:'Fresh & crisp', stock:30 },
  { id:'juice', name:'Organic Juice', category:'Juices', price:4, emoji:'🧃', note:'Cold pressed', stock:24 },
  { id:'honey', name:'Local Honey', category:'Honey', price:7.5, emoji:'🍯', note:'Trusted local producer', stock:18 },
  { id:'eggs', name:'Organic Eggs', category:'Eggs', price:4.5, emoji:'🥚', note:'Free-range', stock:30 },
  { id:'jam', name:'Organic Jam', category:'Preserves', price:5.5, emoji:'🍓', note:'Small-batch', stock:20 },
  { id:'carrots', name:'Fresh Carrots', category:'Vegetables', price:2.5, emoji:'🥕', note:'Seasonal', stock:40 },
  { id:'tomatoes', name:'Vine Tomatoes', category:'Vegetables', price:3.5, emoji:'🍅', note:'Ripe & juicy', stock:40 }
];

const CART_KEY = 'meadow_cart_v2';
let products = [];
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
let active = 'All';

const money = n => `£${Number(n).toFixed(2)}`;
const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

async function loadProducts(){
  try {
    const res = await fetch('/api/products', { headers:{'Accept':'application/json'} });
    if(!res.ok) throw new Error('Products unavailable');
    products = await res.json();
  } catch { products = FALLBACK_PRODUCTS; }
  products = products.filter(p => p.active !== false && Number(p.stock ?? 0) > 0);
  render(); renderCart();
}

function renderCats(){
  const cats = document.getElementById('categories');
  if(!cats) return;
  const categories = ['All', ...new Set(products.map(p => p.category))];
  cats.innerHTML = categories.map(c => `<button class="cat ${c===active?'active':''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
  cats.querySelectorAll('button').forEach(b => b.onclick = () => { active = b.dataset.cat; render(); });
}

function render(){
  renderCats();
  const grid = document.getElementById('productGrid');
  if(!grid) return;
  const shown = active === 'All' ? products : products.filter(p => p.category === active);
  grid.innerHTML = shown.map(p => `<article class="product-card">
    <div class="product-art">${escapeHtml(p.emoji || '🌿')}</div>
    <div class="product-body"><small>${escapeHtml(p.category).toUpperCase()}</small><h3>${escapeHtml(p.name)}</h3><span>${escapeHtml(p.note || 'Carefully sourced')}</span>
      <div class="price-row"><span class="price">${money(p.price)}</span><button class="add" data-id="${escapeHtml(p.id)}">Add to basket</button></div>
    </div></article>`).join('');
  grid.querySelectorAll('.add').forEach(b => b.onclick = () => add(b.dataset.id));
}

function add(id){
  const p = products.find(x => x.id === id); if(!p) return;
  const line = cart.find(x => x.id === id);
  if(line) line.qty = Math.min(line.qty + 1, Number(p.stock)); else cart.push({id, qty:1});
  saveCart(); renderCart(); openCart();
}
function change(id, delta){
  const line = cart.find(x => x.id === id); const p = products.find(x => x.id === id); if(!line || !p) return;
  line.qty += delta;
  if(line.qty > Number(p.stock)) line.qty = Number(p.stock);
  if(line.qty < 1) cart = cart.filter(x => x.id !== id);
  saveCart(); renderCart();
}
function cartTotal(){ return cart.reduce((sum,l) => { const p=products.find(x=>x.id===l.id); return sum + (p ? Number(p.price)*l.qty : 0); }, 0); }
function renderCart(){
  const box = document.getElementById('cartItems'); if(!box) return;
  cart = cart.filter(l => products.some(p => p.id === l.id));
  let count = 0;
  box.innerHTML = cart.length ? cart.map(l => { const p=products.find(x=>x.id===l.id); count += l.qty; return `<div class="cart-line"><div class="cart-thumb">${escapeHtml(p.emoji||'🌿')}</div><div><b>${escapeHtml(p.name)}</b><div class="qty"><button data-id="${p.id}" data-d="-1">−</button><span>${l.qty}</span><button data-id="${p.id}" data-d="1">+</button></div></div><strong>${money(Number(p.price)*l.qty)}</strong></div>`; }).join('') : '<p>Your basket is waiting for something wholesome.</p>';
  box.querySelectorAll('button').forEach(b => b.onclick = () => change(b.dataset.id, Number(b.dataset.d)));
  document.getElementById('cartTotal').textContent = money(cartTotal());
  document.getElementById('cartCount').textContent = count;
}

const drawer = document.getElementById('cartDrawer'); const backdrop = document.getElementById('backdrop');
function openCart(){ drawer?.classList.add('open'); backdrop?.classList.add('show'); drawer?.setAttribute('aria-hidden','false'); }
function closeCart(){ drawer?.classList.remove('open'); backdrop?.classList.remove('show'); drawer?.setAttribute('aria-hidden','true'); }
document.getElementById('openCart')?.addEventListener('click', openCart);
document.getElementById('closeCart')?.addEventListener('click', closeCart);
backdrop?.addEventListener('click', closeCart);

document.querySelector('.mobile-toggle')?.addEventListener('click', () => {
  const n=document.getElementById('nav'); n.classList.toggle('show'); document.querySelector('.mobile-toggle').setAttribute('aria-expanded', n.classList.contains('show'));
});

document.getElementById('checkoutButton')?.addEventListener('click', async () => {
  if(!cart.length) return alert('Your basket is empty.');
  const deliveryDate = prompt('What date would you like your order delivered/collected? Please use YYYY-MM-DD.');
  if(!deliveryDate) return;
  const name = prompt('Your full name:'); if(!name) return;
  const email = prompt('Your email address:'); if(!email) return;
  const phone = prompt('Your phone number:'); if(!phone) return;
  try {
    const res = await fetch('/api/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,email,phone,deliveryDate,items:cart}) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Checkout could not be started');
    if(data.url) window.location.href = data.url;
  } catch(e) { alert(e.message); }
});

loadProducts();
