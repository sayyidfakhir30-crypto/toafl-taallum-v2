const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const notification = req.body;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    const hash = crypto.createHash('sha512')
      .update(`${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`)
      .digest('hex');

    if (hash !== notification.signature_key) {
      return res.status(400).send('Invalid signature');
    }

    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;
    const orderId = notification.order_id;

    let dbStatus = 'pending';

    if (transactionStatus === 'capture') {
      dbStatus = fraudStatus === 'challenge' ? 'challenge' : 'success';
    } else if (transactionStatus === 'settlement') {
      dbStatus = 'success';
    } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
      dbStatus = 'failed';
    } else if (transactionStatus === 'pending') {
      dbStatus = 'pending';
    }

    await supabase
      .from('transactions')
      .update({ status: dbStatus, updated_at: new Date() })
      .eq('order_id', orderId);

    return res.status(200).json({ status: 'OK' });

  } catch (err) {
    console.error('Webhook Error:', err);
    return res.status(500).send('Webhook Handler Error');
  }
};