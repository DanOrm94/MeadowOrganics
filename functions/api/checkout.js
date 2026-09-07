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
  const ids=[...new Set(b.items.filter(x=>!x.customBox).map(x=>x.id))];const placeholders=ids.map(()=>'?').join(',');let results=[];if(ids.length){const q=await env.DB.prepare(`SELECT * FROM products WHERE id IN (${placeholders}) AND active=1`).bind(...ids).all();results=q.results||[]}
  const map=new Map(results.map(p=>[p.id,p]));let total=0;const items=[];
  for(const line of b.items){
   if(line.customBox){
    const sizes={Small:{count:8,price:19},Medium:{count:11,price:25},Large:{count:14,price:31}};const s=sizes[line.boxSize];if(!s||!Array.isArray(line.selections))return json({error:'Invalid custom box selection.'},400);const selections=line.selections.filter(x=>Number(x.qty)>0).map(x=>({id:String(x.id),qty:Math.floor(Number(x.qty))}));if(selections.reduce((n,x)=>n+x.qty,0)!==s.count)return json({error:`Your ${line.boxSize} box must contain exactly ${s.count} items.`},400);const selectedIds=[...new Set(selections.map(x=>x.id))];const boxPlaceholders=selectedIds.map(()=>'?').join(',');const boxRows=selectedIds.length?(await env.DB.prepare(`SELECT * FROM products WHERE id IN (${boxPlaceholders}) AND active=1`).bind(...selectedIds).all()).results||[]:[];const boxMap=new Map(boxRows.map(p=>[p.id,p]));for(const pick of selections){const p=boxMap.get(pick.id);if(!p||pick.qty>Number(p.stock))return json({error:`${p?.name||'A selected product'} is no longer available in that quantity.`},409)}total+=s.price;items.push({id:`custom-box-${line.boxSize.toLowerCase()}`,name:`${line.boxSize} Organic Box`,price:s.price,qty:1,selections});continue;
   }
   const p=map.get(line.id);const qty=Math.max(1,Math.floor(Number(line.qty)));if(!p||qty>p.stock)return json({error:`${p?.name||'A product'} is no longer available in that quantity.`},409);total+=Number(p.price)*qty;items.push({id:p.id,name:p.name,price:Number(p.price),qty});
  }
  const orderId=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO orders(id,name,email,phone,delivery_date,items,total,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(orderId,b.name,b.email,b.phone,b.deliveryDate,JSON.stringify(items),total,paymentMethod==='cash'?'cash_due':'pending',new Date().toISOString()).run();

  if(paymentMethod==='cash'){
   for(const item of items){if(item.selections){for(const pick of item.selections)await env.DB.prepare('UPDATE products SET stock=MAX(stock-?,0) WHERE id=?').bind(pick.qty,pick.id).run()}else await env.DB.prepare('UPDATE products SET stock=MAX(stock-?,0) WHERE id=?').bind(item.qty,item.id).run()}
   return json({url:new URL('/success.html?order='+orderId+'&payment=cash',request.url).toString()});
  }

  const redirectUrl=new URL('/success.html?order='+orderId,request.url).toString();
  const payment=await createDojoPayment(env,orderId,total,{name:b.name,email:b.email},redirectUrl);
  await env.DB.prepare('UPDATE orders SET dojo_payment_intent_id=? WHERE id=?').bind(payment.id,orderId).run();
  return json({url:payment.paymentLink||`https://pay.dojo.tech/checkout/${payment.id}`});
 }catch(e){return json({error:e.message||'Unable to start checkout.'},500)}
}
