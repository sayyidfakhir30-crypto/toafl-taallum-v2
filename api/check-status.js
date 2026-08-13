const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  const { order_id } = req.query;

  if (!order_id) return res.status(400).json({ error: 'Order ID dibutuhkan' });

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};