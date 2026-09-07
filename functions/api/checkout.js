function json(data,status=200){return Response.json(data,{status});}

async function createDojoPayment(env,orderId,total,customer,redirectUrl){
 const r=await fetch('https://api.dojo.tech/payment-intents',{method:'POST',headers:{Authorization:`Basic ${env.DOJO_API_KEY}`,'Content-Type':'application/json',Version:env.DOJO_API_VERSION||'2024-02-05'},body:JSON.stringify({amount:{value:Math.round(total*100),currencyCode:'GBP'},reference:`Meadow-${orderId}`,description:'Meadow Organics online order',customer:{email:customer.email,name:customer.name},config:{redirectUrl},paymentMethods:['Card','Wallet']})});
 const d=await r.json();if(!r.ok)throw new Error(d.detail||d.message||d.title||'Unable to start Dojo payment');return d;
}

export async function onRequestPost({request,env}){
 try{
  const b=await request.json();
  const paymentMethod=b.paymentMethod==='cash'?'cash':'online';
  if(!b.name||!b.email||!b.phone||!/^\d{4}-\d{2}-\d{2}$/.test(b.deliveryDate)||!Array.isArray(b.items)||!b.items.length)return json({error:'Please complete your details and choose a delivery date.'},400);
  const ids=[...new Set(b.items.map(x=>x.id))];const placeholders=ids.map(()=>'?').join(',');const {results}=await env.DB.prepare(`SELECT * FROM products WHERE id IN (${placeholders}) AND active=1`).bind(...ids).all();
  const map=new Map(results.map(p=>[p.id,p]));let total=0;const items=[];
  for(const line of b.items){const p=map.get(line.id);const qty=Math.max(1,Math.floor(Number(line.qty)));if(!p||qty>p.stock)return json({error:`${p?.name||'A product'} is no longer available in that quantity.`},409);total+=Number(p.price)*qty;items.push({id:p.id,name:p.name,price:Number(p.price),qty});}
  const orderId=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO orders(id,name,email,phone,delivery_date,items,total,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(orderId,b.name,b.email,b.phone,b.deliveryDate,JSON.stringify(items),total,paymentMethod==='cash'?'cash_due':'pending',new Date().toISOString()).run();

  if(paymentMethod==='cash'){
   for(const item of items)await env.DB.prepare('UPDATE products SET stock=MAX(stock-?,0) WHERE id=?').bind(item.qty,item.id).run();
   await env.DB.prepare('UPDATE orders SET status=? WHERE id=?').bind('cash_due',orderId).run();
   return json({url:new URL('/success.html?order='+orderId+'&payment=cash',request.url).toString()});
  }

  const redirectUrl=new URL('/success.html?order='+orderId,request.url).toString();
  const payment=await createDojoPayment(env,orderId,total,{name:b.name,email:b.email},redirectUrl);
  await env.DB.prepare('UPDATE orders SET dojo_payment_intent_id=? WHERE id=?').bind(payment.id,orderId).run();
  return json({url:payment.paymentLink||`https://pay.dojo.tech/checkout/${payment.id}`});
 }catch(e){return json({error:e.message||'Unable to start checkout.'},500)}
}
