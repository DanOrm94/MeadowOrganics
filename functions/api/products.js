export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT id,name,category,price,emoji,note,stock,active FROM products WHERE active = 1 AND stock > 0 ORDER BY category,name').all();
  return Response.json(results);
}
