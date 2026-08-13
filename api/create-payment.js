const midtransClient = require('midtrans-client');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nama, email, skor } = req.body;
    const orderId = `TOAFL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const grossAmount = 50000;

    const { error: dbError } = await supabase.from('transactions').insert([{
      order_id: orderId,
      nama_peserta: nama,
      email: email,
      skor: skor,
      amount: grossAmount,
      status: 'pending'
    }]);

    if (dbError) throw dbError;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount
      },
      customer_details: {
        first_name: nama,
        email: email
      },
      item_details: [{
        id: 'CERT-TOAFL',
        price: grossAmount,
        quantity: 1,
        name: 'Sertifikat Kelulusan TOAFL'
      }]
    };

    const transaction = await snap.createTransaction(parameter);
    return res.status(200).json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId
    });

  } catch (err) {
    console.error('Error create-payment:', err);
    return res.status(500).json({ error: err.message });
  }
};