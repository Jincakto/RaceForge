import { useEffect, useState } from 'react'
import * as auth from './services/demoAuth'
import RegistrationOTP from './components/common/RegistrationOTP'
import './App.css'
import './Manager.css'
import './Onboarding.css'

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

function AuthPage({ mode, go, onRegister, onLogin }) {
  const isRegister = mode === 'register'
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [remember, setRemember] = useState(false)
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const submit = async (event) => {
    event.preventDefault()
    if (isRegister && form.password !== form.confirm) return setMessage('Mật khẩu xác nhận chưa khớp.')
    setMessage(''); setBusy(true)
    try {
      if (isRegister) await onRegister(form)
      else await onLogin(form.email, form.password, remember)
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  return <main className="auth-page"><section className="auth-panel"><div className="auth-inner"><Brand onClick={() => go('home')} /><button className="back-home" onClick={() => go('home')}>← <span>Quay lại trang chủ</span></button><div className="auth-heading"><div className="eyebrow muted-eyebrow">{isRegister ? 'BẮT ĐẦU HÀNH TRÌNH' : 'CHÀO MỪNG TRỞ LẠI'}</div><h1>{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</h1><p>{isRegister ? 'Tham gia cộng đồng chăm sóc và huấn luyện ngựa đua.' : 'Đăng nhập để tiếp tục công việc của bạn.'}</p></div>
    <form className="auth-form" onSubmit={submit}>
      {isRegister && <label>Họ và tên<input required value={form.name} onChange={set('name')} placeholder="Nguyễn Minh Anh" autoComplete="name"/></label>}
      <label>Email<input required type="email" value={form.email} onChange={set('email')} placeholder="ten@email.com" autoComplete="email"/></label>
      {isRegister && <label>Số điện thoại <span className="optional">Không bắt buộc</span><input type="tel" value={form.phone} onChange={set('phone')} placeholder="0912 345 678" autoComplete="tel"/></label>}
      <label>Mật khẩu<input required type="password" minLength="8" value={form.password} onChange={set('password')} placeholder="Ít nhất 8 ký tự" autoComplete={isRegister ? 'new-password' : 'current-password'}/></label>
      {isRegister && <label>Xác nhận mật khẩu<input required type="password" value={form.confirm} onChange={set('confirm')} placeholder="Nhập lại mật khẩu" autoComplete="new-password"/></label>}
      {message && <p role="alert" className="form-error">{message}</p>}
      {!isRegister && <div className="forgot-row"><label className="remember"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)}/> Ghi nhớ đăng nhập</label><button type="button" onClick={() => setMessage('Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.')}>Quên mật khẩu?</button></div>}
      <button className="button button-gold submit-button" type="submit" disabled={busy}>{busy ? 'Đang xử lý...' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'} <span>→</span></button>
      {!isRegister && <button className="manager-demo-link" type="button" onClick={() => go('manager')}>Xem thử giao diện Club Manager <span>↗</span></button>}
    </form>
    <p className="auth-switch">{isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <button onClick={() => go(isRegister ? 'login' : 'register')}>{isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}</button></p><div className="auth-footnote">Bằng việc tiếp tục, bạn đồng ý với <a href="#terms">Điều khoản sử dụng</a> và <a href="#privacy">Chính sách bảo mật</a>.</div></div></section>
    <aside className={`auth-image ${isRegister ? 'register-image' : ''}`} style={{ backgroundImage: `url(${isRegister ? photos.register : photos.login})` }}><div className="auth-image-overlay"/><div className="auth-quote"><span className="quote-mark">“</span><blockquote>Mỗi buổi tập là một bước tiến đến chiến thắng tiếp theo.</blockquote><div className="quote-rule"/><span className="quote-label">RACEFORCE <i>·</i> THE PURSUIT OF EXCELLENCE</span></div><span className="image-credit">SỨC MẠNH ĐẾN TỪ SỰ TẬN TÂM</span></aside>
  </main>
}

function OnboardingPage({ user, onLogout, go }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const firstName = user.name.trim().split(/\s+/).at(-1)
  const initials = user.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()
  return <main className="onboarding-page">
    <div className="account-menu-wrap">
      <button className="account-avatar-button" aria-label="Mở menu tài khoản" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{initials || 'U'}</button>
      {menuOpen && <div className="account-dropdown"><div className="account-details"><b>{user.name}</b><span>{user.email}</span></div><button className="account-logout" onClick={onLogout}><span>→</span> Đăng xuất</button></div>}
    </div>
    <section className="onboarding-content"><div className="onboarding-horse-mark">♞</div><div className="onboarding-welcome"><span className="onboarding-eyebrow">RACEFORCE · CHÀO MỪNG BẠN</span><h1>Chào mừng, {firstName}!</h1><p>Tài khoản đã xác thực. Hãy tham gia một trung tâm huấn luyện.</p></div>
      <button className="join-center-card" onClick={() => go('join-center')}><span className="join-icon">🤝</span><b>Tham gia trung tâm huấn luyện</b><span className="join-description">Tìm và gửi yêu cầu vào trung tâm. Quản lý sẽ xét duyệt và phân công vai trò cho bạn.</span><strong>Tìm trung tâm <span>→</span></strong></button>
      <p className="manager-only-note">Chỉ Quản lý trung tâm mới có quyền tạo trung tâm mới.</p>
    </section>
    <button className="help-button" aria-label="Trợ giúp">?</button>
  </main>
}

const availableCenters = [
  { id: 'saigon-racing', name: 'Saigon Racing Center', location: 'TP. Hồ Chí Minh', members: 6, founded: 2015, description: 'Trung tâm huấn luyện ngựa đua hàng đầu tại Việt Nam, thành lập năm 2015 với đội ngũ chuyên nghiệp.', letter: 'S' },
  { id: 'hanoi-equestrian', name: 'Hanoi Equestrian Center', location: 'Hà Nội', members: 12, founded: 2010, description: 'Trung tâm huấn luyện ngựa đua truyền thống tại Hà Nội, chuyên về các giải đua quốc gia và quốc tế.', letter: 'H' },
]

function JoinCenterPage({ user, onLogout, go }) {
  const [search, setSearch] = useState('')
  const requestKey = `raceforce-demo-requests-${user.email}`
  const [requested, setRequested] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(requestKey) || '[]')
      return saved.map(item => typeof item === 'string' ? { clubId: item, requestedAt: '02/10/2026', expiresAt: '09/10/2026', status: 'pending' } : item)
    } catch { return [] }
  })
  const filtered = availableCenters.filter(center => center.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const sendRequest = (centerId) => {
    const now = new Date()
    const expires = new Date(now)
    expires.setDate(expires.getDate() + 7)
    const formatDate = date => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const updated = [...requested, { clubId: centerId, requestedAt: formatDate(now), expiresAt: formatDate(expires), status: 'pending' }]
    setRequested(updated)
    window.localStorage.setItem(requestKey, JSON.stringify(updated))
  }
  const initials = user.name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()
  const [menuOpen, setMenuOpen] = useState(false)
  return <main className="join-page">
    <div className="join-page-account"><button className="join-page-avatar" aria-label="Mở menu tài khoản" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{initials || 'U'}</button>{menuOpen && <div className="account-dropdown"><div className="account-details"><b>{user.name}</b><span>{user.email}</span></div><button className="account-logout" onClick={onLogout}><span>→</span> Đăng xuất</button></div>}</div>
    <div className="join-page-content"><button className="join-back" onClick={() => go('onboarding')}>← Quay lại</button>
      <header className="join-page-heading"><span className="join-page-icon">🤝</span><h1>Tham gia trung tâm</h1><p>Gửi yêu cầu và chờ Quản lý phân công vai trò</p></header>
      <label className="center-search"><span>🔍</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên trung tâm..." aria-label="Tìm tên trung tâm"/></label>
      <section className="center-list" aria-label="Danh sách trung tâm">{filtered.map(center => {
        const sent = requested.some(request => request.clubId === center.id)
        return <article className="center-card" key={center.id}><div className="center-logo">{center.letter}</div><div className="center-details"><h2>{center.name}</h2><div className="center-meta"><span>📍 {center.location}</span><span>👥 {center.members} thành viên</span><span>{center.founded}</span></div><p>{center.description}</p></div><button className={`center-request-button ${sent ? 'center-request-sent' : ''}`} disabled={sent} onClick={() => sendRequest(center.id)}>{sent ? '✓ Đã gửi' : 'Gửi yêu cầu'}</button></article>
      })}{filtered.length === 0 && <div className="centers-empty">Không tìm thấy trung tâm phù hợp.</div>}</section>
      {requested.length > 0 && <div className="request-confirmation"><b>✓ Yêu cầu đã được gửi!</b><span>Quản lý sẽ xem xét và phân công vai trò.</span><button onClick={() => go('pending')}>Xem trạng thái →</button></div>}
    </div>
    <button className="help-button" aria-label="Trợ giúp">?</button>
  </main>
}

function PendingPage({ user, onLogout, go }) {
  const requestKey = `raceforce-demo-requests-${user.email}`
  let requests = []
  try { requests = JSON.parse(window.localStorage.getItem(requestKey) || '[]') } catch { requests = [] }
  requests = requests.map(item => typeof item === 'string' ? { clubId: item, requestedAt: '02/10/2026', expiresAt: '09/10/2026', status: 'pending' } : item)
  const initials = user.name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()
  const [menuOpen, setMenuOpen] = useState(false)
  const centerById = Object.fromEntries(availableCenters.map(center => [center.id, center]))
  return <main className="pending-page">
    <div className="join-page-account"><button className="join-page-avatar" aria-label="Mở menu tài khoản" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{initials || 'U'}</button>{menuOpen && <div className="account-dropdown"><div className="account-details"><b>{user.name}</b><span>{user.email}</span></div><button className="account-logout" onClick={onLogout}><span>→</span> Đăng xuất</button></div>}</div>
    <section className="pending-content"><div className="pending-hourglass">⌛</div><h1>Đang chờ duyệt</h1><p className="pending-subtitle">Yêu cầu tham gia đang được Quản lý xem xét.</p>
      <div className="pending-list">{requests.map((request, index) => {
        const center = centerById[request.clubId]
        if (!center) return null
        return <article className="pending-request-card" key={`${request.clubId}-${index}`}><div className="center-logo">{center.letter}</div><div className="pending-request-info"><b>{center.name}</b><span>{request.requestedAt} · Hết hạn {request.expiresAt}</span></div><span className="pending-status">{request.status || 'pending'}</span></article>
      })}</div>
      <button className="pending-find-more" onClick={() => go('join-center')}>Tìm trung tâm khác</button>
    </section>
    <button className="help-button" aria-label="Trợ giúp">?</button>
  </main>
}

const managerNav = [
  ['▦', 'Tổng quan'], ['♞', 'Ngựa trong trung tâm'], ['✓', 'Duyệt đăng ký ngựa', '3'],
  ['♧', 'Nhân sự'], ['✉', 'Yêu cầu tham gia', '2'], ['♜', 'Kết quả đua'], ['▤', 'Báo cáo'],
]
const managerHorses = [
  { name: 'Thunder King', breed: 'Thoroughbred', detail: 'Đực · 5 tuổi', status: 'Đủ điều kiện', color: 'green', image: 'photo-1553284965-83fd3e82fa5a' },
  { name: 'Silver Comet', breed: 'Arabian', detail: 'Cái · 4 tuổi', status: 'Theo dõi', color: 'amber', image: 'photo-1566251037378-5e04e3bec343' },
  { name: 'Golden Arrow', breed: 'Thoroughbred', detail: 'Đực · 6 tuổi', status: 'Đủ điều kiện', color: 'green', image: 'photo-1534307676014-7f9b6c1c1cd1' },
]
const trend = [36, 45, 41, 58, 53, 66, 61, 76, 69, 86, 79, 94]

function ManagerDashboard({ go }) {
  const [active, setActive] = useState('Tổng quan')
  const [period, setPeriod] = useState('7 ngày qua')
  const [menuOpen, setMenuOpen] = useState(false)
  const onNav = (label) => { setActive(label); if (label === 'Tổng quan') return; }
  return <main className="manager-app">
    <aside className={`manager-sidebar ${menuOpen ? 'manager-sidebar-open' : ''}`}>
      <div className="manager-brand-row"><Brand onClick={() => setActive('Tổng quan')} /><button className="sidebar-close" onClick={() => setMenuOpen(false)}>×</button></div>
      <div className="manager-club-switch"><div className="club-emblem">R</div><span><b>Royal Stables</b><small>TRUNG TÂM HUẤN LUYỆN</small></span><span className="switch-caret">⌄</span></div>
      <div className="nav-caption">KHÔNG GIAN LÀM VIỆC</div>
      <nav className="manager-nav">{managerNav.map(([icon,label,badge])=><button key={label} className={active === label ? 'manager-nav-active' : ''} onClick={() => { onNav(label); setMenuOpen(false) }}><span className="nav-icon">{icon}</span><span>{label}</span>{badge && <i>{badge}</i>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="settings-link" onClick={() => setActive('Cài đặt')}><span className="nav-icon">⚙</span>Cài đặt trung tâm</button><div className="manager-user"><div className="manager-avatar">NA</div><div><b>Nguyễn Minh Anh</b><small>Club Manager</small></div><button aria-label="Tùy chọn tài khoản" onClick={() => go('home')}>⋯</button></div><button className="exit-preview" onClick={() => go('home')}>← <span>Thoát bản xem trước</span></button></div>
    </aside>
    {menuOpen && <button className="manager-scrim" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}/>}
    <section className="manager-workspace"><header className="manager-topbar"><button className="manager-menu-button" onClick={() => setMenuOpen(true)} aria-label="Mở menu">☰</button><div className="breadcrumbs">Royal Stables <span>/</span> <b>{active}</b></div><div className="topbar-tools"><div className="today-date"><span>THỨ TƯ</span><b>01 THÁNG 10, 2026</b></div><button className="manager-icon-button" aria-label="Tìm kiếm">⌕</button><button className="manager-icon-button notification-button" aria-label="Thông báo">♧<i>2</i></button><div className="topbar-avatar">NA</div></div></header>
      <div className="manager-content"><div className="manager-page-heading"><div><div className="manager-overline">THỨ TƯ, 01 THÁNG 10, 2026 <span>·</span> MÙA GIẢI 2026</div><h1>{active === 'Tổng quan' ? 'Tổng quan trung tâm' : active}</h1><p>Theo dõi hoạt động và hiệu suất của Royal Stables.</p></div><div className="heading-actions"><button className="manager-outline-button" onClick={() => setActive('Báo cáo')}>↓ <span>Xuất báo cáo</span></button><button className="manager-primary-button" onClick={() => setActive('Ngựa trong trung tâm')}>＋ <span>Thêm ngựa</span></button></div></div>
      {active !== 'Tổng quan' && <div className="manager-demo-note"><span>◈</span><div><b>{active} — bản xem trước</b><p>Điều hướng giao diện đang ở chế độ mẫu. Dữ liệu chưa kết nối backend.</p></div><button onClick={() => setActive('Tổng quan')}>Về tổng quan</button></div>}
      <div className="manager-stat-grid"><article className="manager-stat"><div className="stat-top"><span>TỔNG SỐ NGỰA</span><i className="stat-icon horse-stat-icon">♞</i></div><div className="stat-value">24 <small>con</small></div><div className="stat-foot"><span className="stat-trend">↗ 12%</span><span>so với tháng trước</span></div><div className="stat-spark spark-gold">▁▂▂▄▃▅▄▆▅▇▆█</div></article>
        <article className="manager-stat"><div className="stat-top"><span>SẴN SÀNG THI ĐẤU</span><i className="stat-icon ready-stat-icon">✓</i></div><div className="stat-value">18 <small>/ 24</small></div><div className="stat-foot"><span className="stat-subtle">75% tổng đàn</span><span>Đã được thú y phê duyệt</span></div><div className="stat-progress"><i style={{width:'75%'}}/></div></article>
        <article className="manager-stat"><div className="stat-top"><span>NHÂN SỰ</span><i className="stat-icon people-stat-icon">♧</i></div><div className="stat-value">12 <small>thành viên</small></div><div className="stat-foot"><span className="stat-trend">+2 mới</span><span>trong tháng này</span></div><div className="mini-avatars"><i>LT</i><i>TH</i><i>QM</i><i>+9</i></div></article>
        <article className="manager-stat"><div className="stat-top"><span>YÊU CẦU CHỜ DUYỆT</span><i className="stat-icon pending-stat-icon">◷</i></div><div className="stat-value">05 <small>yêu cầu</small></div><div className="stat-foot"><span className="stat-pending">Cần xử lý</span><span>2 thành viên · 3 ngựa</span></div><button className="stat-action" onClick={() => setActive('Yêu cầu tham gia')}>Xem yêu cầu <span>→</span></button></article></div>
      <div className="manager-main-grid"><section className="manager-card horse-card"><div className="manager-card-heading"><div><h2>Ngựa trong trung tâm</h2><p>Danh sách ngựa đang được quản lý</p></div><button onClick={() => setActive('Ngựa trong trung tâm')}>Xem tất cả <span>→</span></button></div><div className="horse-table"><div className="horse-table-head"><span>TÊN NGỰA</span><span>GIỐNG · TUỔI</span><span>TÌNH TRẠNG</span><span>HIỆU SUẤT</span></div>{managerHorses.map((horse,i)=><div className="horse-row" key={horse.name}><div className="horse-identity"><img src={`https://images.unsplash.com/${horse.image}?auto=format&fit=crop&w=100&h=100&q=75`} alt=""/><div className="horse-name"><b>{horse.name}</b><small>RF-2026-{String(i+21).padStart(3,'0')}</small></div></div><div className="horse-breed">{horse.breed}<small>{horse.detail}</small></div><div><span className={`horse-status status-${horse.color}`}><i/>{horse.status}</span></div><div className="horse-performance"><b>{[92,76,88][i]}<small>/100</small></b><span className="performance-line"><i style={{width:`${[92,76,88][i]}%`}}/></span></div></div>)}</div><button className="mobile-see-all" onClick={() => setActive('Ngựa trong trung tâm')}>Xem toàn bộ danh sách →</button></section>
        <section className="manager-card performance-card"><div className="manager-card-heading"><div><h2>Hiệu suất trung tâm</h2><p>Tốc độ và thể lực trung bình</p></div><select value={period} onChange={e=>setPeriod(e.target.value)} aria-label="Khoảng thời gian"><option>7 ngày qua</option><option>30 ngày qua</option><option>Mùa giải</option></select></div><div className="chart-legend"><span><i/> Tốc độ TB <b>58.6 <small>km/h</small></b></span><span><i/> Thể lực TB <b>84 <small>%</small></b></span></div><div className="manager-chart"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-area"><div className="chart-gridlines"><i/><i/><i/><i/><i/></div><div className="chart-bars">{trend.map((v,i)=><div className="chart-column" key={i}><i style={{height:`${v}%`}}/><b style={{height:`${Math.max(20,v-17)}%`}}/></div>)}</div><div className="chart-x"><span>24 T.9</span><span>26 T.9</span><span>28 T.9</span><span>01 T.10</span></div></div></div><div className="chart-footer"><span>So với tuần trước</span><b>↗ 8.4% <small>tăng trưởng</small></b></div></section></div>
      <div className="manager-bottom-grid"><section className="manager-card requests-card"><div className="manager-card-heading"><div><h2>Yêu cầu cần xử lý</h2><p>Các yêu cầu mới gửi đến trung tâm</p></div><button onClick={() => setActive('Yêu cầu tham gia')}>Tất cả <span>→</span></button></div><div className="request-item"><div className="request-avatar avatar-blue">♞</div><div className="request-copy"><b>Đăng ký ngựa · Moonlight</b><small>Chủ ngựa Trần Quốc Bảo · 2 giờ trước</small></div><span className="request-tag">NGỰA MỚI</span><button className="request-open" onClick={() => setActive('Duyệt đăng ký ngựa')}>→</button></div><div className="request-item"><div className="request-avatar avatar-sand">PL</div><div className="request-copy"><b>Yêu cầu tham gia · Phạm Gia Linh</b><small>Ứng tuyển vị trí Head Trainer · 5 giờ trước</small></div><span className="request-tag member-tag">NHÂN SỰ</span><button className="request-open" onClick={() => setActive('Yêu cầu tham gia')}>→</button></div></section>
        <section className="manager-card activity-card"><div className="manager-card-heading"><div><h2>Hoạt động gần đây</h2><p>Cập nhật mới nhất trong trung tâm</p></div><button onClick={() => setActive('Báo cáo')}>Nhật ký <span>→</span></button></div><div className="activity-item"><span className="activity-marker marker-gold">✓</span><div><b>Thunder King hoàn thành buổi tập</b><small>Hôm nay, 08:42 · bởi Lê Thành Long</small></div></div><div className="activity-item"><span className="activity-marker marker-green">＋</span><div><b>Hồ sơ sức khỏe được cập nhật</b><small>Hôm nay, 07:15 · bởi BS. Nguyễn Hà</small></div></div></section></div>
      <footer className="manager-footer"><span>RACEFORCE <i>·</i> ROYAL STABLES</span><span>DỮ LIỆU MINH HỌA <i>·</i> FRONTEND PREVIEW</span></footer></div></section>
  </main>
}

export default function App() {
  const [page, setPage] = useState(() => window.location.pathname.replace('/', '') || 'home')
  const [user, setUser] = useState(auth.getSession)
  const [pendingAccount, setPendingAccount] = useState(null)
  useEffect(() => {
    const onBack = () => setPage(window.location.pathname.replace('/', '') || 'home')
    window.addEventListener('popstate', onBack)
    return () => window.removeEventListener('popstate', onBack)
  }, [])
  const go = (next) => { setPage(next); window.history.pushState({}, '', next === 'home' ? '/' : '/' + next); window.scrollTo(0, 0) }
  const register = async (form) => setPendingAccount(await auth.prepareRegistration(form))
  const login = async (email, password, remember) => {
    setUser(await auth.login(email, password, remember)); go('onboarding')
  }
  const logout = () => { auth.logout(); setUser(null); go('login') }
  const completeRegistration = () => {
    setUser(auth.finishRegistration(pendingAccount)); setPendingAccount(null); go('onboarding')
  }
  let content
  if (page === 'manager') content = <ManagerDashboard go={go}/>
  else if (page === 'pending' && user) content = <PendingPage user={user} onLogout={logout} go={go}/>
  else if (page === 'join-center' && user) content = <JoinCenterPage user={user} onLogout={logout} go={go}/>
  else if (page === 'onboarding' && user) content = <OnboardingPage user={user} onLogout={logout} go={go}/>
  else if (['login', 'register', 'pending', 'join-center', 'onboarding'].includes(page)) content = <AuthPage key={page} mode={page === 'register' ? 'register' : 'login'} go={go} onRegister={register} onLogin={login}/>
  else content = <Home go={go}/>
  return <>{content}{pendingAccount && <RegistrationOTP email={pendingAccount.email} onVerified={completeRegistration} onCancel={() => setPendingAccount(null)}/>}</>
}
