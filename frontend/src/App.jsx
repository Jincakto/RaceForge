import { useState } from 'react'
import './App.css'

const photos = {
  hero: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=85',
  login: 'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&w=1100&q=85',
  register: 'https://images.unsplash.com/photo-1566288623394-377af472d81b?auto=format&fit=crop&w=1100&q=85',
}

function Brand({ onClick, compact = false }) {
  return <button className={`brand ${compact ? 'brand-compact' : ''}`} onClick={onClick} aria-label="RaceForce - Trang chủ">
    <span className="brand-mark">♞</span><span className="brand-copy"><b>RaceForce</b><small>HORSE RACING MANAGEMENT</small></span>
  </button>
}

function Home({ go }) {
  const features = [
    ['✦', 'Giáo án thông minh', 'Lộ trình tập luyện theo thể trạng, tuổi và lịch sử thi đấu của từng chú ngựa.'],
    ['＋', 'Chăm sóc sức khỏe', 'Theo dõi hồ sơ khám, chỉ số sức khỏe và lịch chăm sóc trên cùng một nền tảng.'],
    ['♧', 'Phối hợp liền mạch', 'Kết nối quản lý, huấn luyện viên, bác sĩ thú y, nhân viên chăm sóc và chủ ngựa.'],
  ]
  return <main className="home-page">
    <header className="site-header"><Brand onClick={() => go('home')} /><nav><a href="#features">Tính năng</a><button className="text-button" onClick={() => go('login')}>Đăng nhập</button><button className="button button-gold button-small" onClick={() => go('register')}>Tạo tài khoản <span>↗</span></button></nav></header>
    <section className="hero-section">
      <div className="hero-copy"><div className="eyebrow"><i /> NỀN TẢNG QUẢN LÝ ĐUA NGỰA</div><h1>Chăm sóc tốt hơn.<br/><em>Thi đấu</em> mạnh mẽ hơn.</h1><p className="hero-lead">Mọi thông tin về sức khỏe, huấn luyện và thành tích của ngựa đua — kết nối trong một nền tảng duy nhất.</p><div className="hero-actions"><button className="button button-gold" onClick={() => go('register')}>Bắt đầu miễn phí <span>→</span></button><button className="button button-quiet" onClick={() => go('login')}>Tôi đã có tài khoản</button></div><div className="hero-proof"><div className="proof-icons"><span>♞</span><span>♞</span><span>♞</span></div><span>Đồng hành cùng những đội ngũ tận tâm</span></div></div>
      <div className="hero-visual"><img src={photos.hero} alt="Ngựa đua đang phi trên đường đua"/><div className="image-shade"/><div className="photo-caption"><span className="caption-dot"/><span><b>Hiệu suất bắt đầu từ sự chăm sóc</b><small>Mỗi ngày, một bước tiến gần hơn đến chiến thắng.</small></span></div><div className="hero-index">01 <span>—</span> 03</div></div>
    </section>
    <section className="feature-section" id="features"><div className="section-heading"><div><div className="eyebrow muted-eyebrow">MỌI THỨ TRONG TẦM TAY</div><h2>Một đội ngũ. Một nhịp điệu.</h2></div><p>Công cụ cần thiết để vận hành trung tâm huấn luyện và giúp mỗi chú ngựa phát huy hết tiềm năng.</p></div><div className="feature-grid">{features.map(([icon,title,desc],i)=><article className="feature-card" key={title}><div className="feature-top"><span className="feature-icon">{icon}</span><span className="feature-number">0{i+1}</span></div><h3>{title}</h3><p>{desc}</p><span className="feature-arrow">↗</span></article>)}</div></section>
    <footer className="site-footer"><Brand onClick={() => go('home')} compact/><span>© 2026 RaceForce. Dành cho những người yêu ngựa và đam mê đường đua.</span><button onClick={() => go('login')}>Đăng nhập <span>→</span></button></footer>
  </main>
}

function AuthPage({ mode, go }) {
  const isRegister = mode === 'register'
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [message, setMessage] = useState('')
  const [complete, setComplete] = useState(false)
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const submit = (event) => {
    event.preventDefault()
    if (isRegister && form.password !== form.confirm) return setMessage('Mật khẩu xác nhận chưa khớp.')
    if (isRegister && form.password.length < 6) return setMessage('Mật khẩu cần có ít nhất 6 ký tự.')
    // Frontend prototype only: no API request or account is created.
    setMessage(isRegister ? 'Thông tin đã được ghi nhận trong bản xem trước.' : 'Đây là giao diện xem trước; chức năng đăng nhập chưa được kết nối.')
    setComplete(true)
  }
  return <main className="auth-page"><section className="auth-panel"><div className="auth-inner"><Brand onClick={() => go('home')} /><button className="back-home" onClick={() => go('home')}>← <span>Quay lại trang chủ</span></button><div className="auth-heading"><div className="eyebrow muted-eyebrow">{isRegister ? 'BẮT ĐẦU HÀNH TRÌNH' : 'CHÀO MỪNG TRỞ LẠI'}</div><h1>{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</h1><p>{isRegister ? 'Tham gia cộng đồng chăm sóc và huấn luyện ngựa đua.' : 'Đăng nhập để tiếp tục công việc của bạn.'}</p></div>
    {complete ? <div className="form-notice"><span>✓</span><div><b>{isRegister ? 'Đã nhận thông tin' : 'Bản xem trước'}</b><p>{message}</p></div><button onClick={() => setComplete(false)}>Chỉnh sửa</button></div> : <form className="auth-form" onSubmit={submit}>
      {isRegister && <label>Họ và tên<input required value={form.name} onChange={set('name')} placeholder="Nguyễn Minh Anh" autoComplete="name"/></label>}
      <label>Email<input required type="email" value={form.email} onChange={set('email')} placeholder="ten@email.com" autoComplete="email"/></label>
      {isRegister && <label>Số điện thoại <span className="optional">Không bắt buộc</span><input type="tel" value={form.phone} onChange={set('phone')} placeholder="0912 345 678" autoComplete="tel"/></label>}
      <label>Mật khẩu<input required type="password" minLength="6" value={form.password} onChange={set('password')} placeholder="Ít nhất 6 ký tự" autoComplete={isRegister ? 'new-password' : 'current-password'}/></label>
      {isRegister && <label>Xác nhận mật khẩu<input required type="password" value={form.confirm} onChange={set('confirm')} placeholder="Nhập lại mật khẩu" autoComplete="new-password"/></label>}
      {message && <p className="form-error">{message}</p>}
      {!isRegister && <div className="forgot-row"><label className="remember"><input type="checkbox"/> Ghi nhớ đăng nhập</label><button type="button" onClick={() => setMessage('Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.')}>Quên mật khẩu?</button></div>}
      <button className="button button-gold submit-button" type="submit">{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'} <span>→</span></button>
    </form>}
    <p className="auth-switch">{isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <button onClick={() => go(isRegister ? 'login' : 'register')}>{isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}</button></p><div className="auth-footnote">Bằng việc tiếp tục, bạn đồng ý với <a href="#terms">Điều khoản sử dụng</a> và <a href="#privacy">Chính sách bảo mật</a>.</div></div></section>
    <aside className={`auth-image ${isRegister ? 'register-image' : ''}`} style={{ backgroundImage: `url(${isRegister ? photos.register : photos.login})` }}><div className="auth-image-overlay"/><div className="auth-quote"><span className="quote-mark">“</span><blockquote>Mỗi buổi tập là một bước tiến đến chiến thắng tiếp theo.</blockquote><div className="quote-rule"/><span className="quote-label">RACEFORCE <i>·</i> THE PURSUIT OF EXCELLENCE</span></div><span className="image-credit">SỨC MẠNH ĐẾN TỪ SỰ TẬN TÂM</span></aside>
  </main>
}

export default function App() {
  const [page, setPage] = useState(() => window.location.pathname.replace('/', '') || 'home')
  const go = (next) => { setPage(next); window.history.pushState({}, '', next === 'home' ? '/' : `/${next}`); window.scrollTo(0, 0) }
  return page === 'login' || page === 'register' ? <AuthPage mode={page} go={go}/> : <Home go={go}/>
}
