import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { postOrder } from '../api/orders.js'
import { postPayosCreateLink } from '../api/payment.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { formatPrice } from '../utils/format.js'
import { mapServerOrderToShop } from '../utils/orderMap.js'

async function parseJsonOrThrow(res) {
  const text = await res.text()
  if (!res.ok) {
    throw new Error(text || `Lỗi máy chủ (${res.status})`)
  }
  if (!text) return null
  return JSON.parse(text)
}

function normalizeItems(items) {
  return (items || [])
    .map((it) => ({
      productId: it.productId ?? it.id,
      name: it.name ?? 'Sản phẩm',
      price: Number(it.price || 0),
      imageUrl: it.imageUrl || '',
      quantity: Math.max(1, Number(it.quantity || 1)),
    }))
    .filter((it) => it.productId != null)
}

export default function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { cart, pricing, mergeServerOrder, clearCart } = useShop()

  const buyNowItems = useMemo(() => {
    const st = location.state
    if (!st || st.mode !== 'buyNow') return null
    return normalizeItems(st.items)
  }, [location.state])

  const items = buyNowItems || cart.items
  const isBuyNow = Boolean(buyNowItems)

  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.username || '',
    phone: '',
    addressLine: '',
    city: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0)
    const discount = isBuyNow ? 0 : pricing.discount
    const total = Math.max(0, subtotal - discount)
    return { subtotal, discount, total }
  }, [items, pricing.discount, isBuyNow])

  async function placeOrder(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!items.length) {
      setError('Không có sản phẩm để thanh toán.')
      return
    }

    if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.addressLine) {
      setError('Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ.')
      return
    }

    try {
      const payload = {
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
        shippingAddress: {
          fullName: shippingAddress.fullName,
          phone: shippingAddress.phone,
          addressLine: shippingAddress.addressLine,
          city: shippingAddress.city || '',
        },
        paymentMethod,
        note,
      }

      if (!isBuyNow && cart.voucher?.code) {
        payload.voucherCode = cart.voucher.code
      }

      const created = await parseJsonOrThrow(await postOrder(payload))

      if (paymentMethod === 'PAYOS_NAPAS247') {
        console.log('[Checkout] Creating PayOS payment link for order:', created.id)
        const linkRes = await postPayosCreateLink(created.id)
        console.log('[Checkout] PayOS link response status:', linkRes.status)
        if (!linkRes.ok) {
          const errorText = await linkRes.text()
          console.error('[Checkout] PayOS link creation failed:', errorText)
          throw new Error(`Không thể tạo link thanh toán: ${errorText}`)
        }
        const linkBody = await parseJsonOrThrow(linkRes)
        const url = linkBody?.checkoutUrl
        if (!url) {
          throw new Error('Máy chủ không trả về link thanh toán PayOS.')
        }
        if (!isBuyNow) clearCart()
        window.location.href = url
        return
      }

      mergeServerOrder(mapServerOrderToShop(created))
      if (!isBuyNow) clearCart()
      const oid = String(created.id)
      setSuccess(`Đặt hàng thành công. Mã đơn: ${oid}`)
      window.setTimeout(() => {
        navigate('/orders', { replace: true, state: { highlightOrderId: oid } })
      }, 900)
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi thanh toán.')
    }
  }

  return (
    <section className="checkout-page">
      <header className="page-header compact">
        <div>
          <h2>Thanh toán</h2>
          <p className="muted">Hoàn tất đơn hàng của bạn.</p>
        </div>
        <div className="header-actions">
          <Link to="/cart" className="btn btn-secondary btn-sm">
            Quay lại giỏ
          </Link>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      {items.length === 0 ? (
        <div className="empty-state">
          <h3>Không có sản phẩm</h3>
          <p>Giỏ hàng trống. Hãy thêm sản phẩm trước khi thanh toán.</p>
          <div style={{ marginTop: 12 }}>
            <Link to="/" className="btn btn-primary">
              Xem sản phẩm
            </Link>
          </div>
        </div>
      ) : (
        <div className="checkout-grid">
          <article className="card checkout-form">
            <h3>Thông tin giao hàng</h3>
            <form onSubmit={placeOrder} className="form-grid" style={{ marginTop: 12 }}>
              <label>
                Họ tên *
                <input
                  value={shippingAddress.fullName}
                  onChange={(e) => setShippingAddress((s) => ({ ...s, fullName: e.target.value }))}
                  required
                />
              </label>
              <label>
                Số điện thoại *
                <input
                  value={shippingAddress.phone}
                  onChange={(e) => setShippingAddress((s) => ({ ...s, phone: e.target.value }))}
                  required
                />
              </label>
              <label className="span-2">
                Địa chỉ *
                <input
                  value={shippingAddress.addressLine}
                  onChange={(e) => setShippingAddress((s) => ({ ...s, addressLine: e.target.value }))}
                  required
                />
              </label>
              <label>
                Thành phố
                <input value={shippingAddress.city} onChange={(e) => setShippingAddress((s) => ({ ...s, city: e.target.value }))} />
              </label>
              <label>
                Thanh toán
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="COD">COD (nhận hàng trả tiền)</option>
                  <option value="CARD">Thẻ (mô phỏng)</option>
                  <option value="BANK">Chuyển khoản (mô phỏng)</option>
                  <option value="PAYOS_NAPAS247">Thanh toán Napas 247 (PayOS / VietQR)</option>
                </select>
              </label>
              <label className="span-2">
                Ghi chú
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: giao giờ hành chính..." />
              </label>

              <div className="form-actions span-2">
                <button type="submit" className="btn btn-primary">
                  Đặt hàng
                </button>
                <Link to="/" className="btn btn-secondary">
                  Tiếp tục mua
                </Link>
              </div>
            </form>
          </article>

          <aside className="card checkout-summary">
            <h3>Đơn hàng</h3>
            <div className="checkout-items">
              {items.map((it) => (
                <div key={it.productId} className="checkout-row">
                  <div className="checkout-prod">
                    <img
                      className="cart-thumb"
                      src={
                        it.imageUrl ||
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80'
                      }
                      alt={it.name}
                    />
                    <div>
                      <div className="cart-name">{it.name}</div>
                      <div className="muted small">
                        {formatPrice(it.price)} × {it.quantity}
                      </div>
                    </div>
                  </div>
                  <strong>{formatPrice(it.price * it.quantity)}</strong>
                </div>
              ))}
            </div>

            <div className="summary-row">
              <span className="muted">Tạm tính</span>
              <strong>{formatPrice(totals.subtotal)}</strong>
            </div>
            <div className="summary-row">
              <span className="muted">Giảm giá</span>
              <strong>{formatPrice(totals.discount)}</strong>
            </div>
            <div className="summary-row total">
              <span>Tổng</span>
              <strong>{formatPrice(totals.total)}</strong>
            </div>

            {!isBuyNow && cart.voucher ? (
              <div className="alert alert-success" style={{ marginTop: 12 }}>
                Voucher: <strong>{cart.voucher.code}</strong>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  )
}

