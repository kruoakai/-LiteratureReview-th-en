import { writable, derived, get } from 'svelte/store'

// UI language: Thai (default) or English. Only the app's own text is translated; corpus content
// (titles, notes, citations) is shown exactly as entered. The choice is kept per browser.
export const LANGS = [
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'EN' },
]
const DEFAULT_LANG = 'th'
const STORAGE_KEY = 'lang'

function initialLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (LANGS.some((l) => l.code === v)) return v
  } catch {}
  return DEFAULT_LANG
}

export const lang = writable(initialLang())
lang.subscribe((v) => {
  try { localStorage.setItem(STORAGE_KEY, v) } catch {}
  if (typeof document !== 'undefined') document.documentElement.lang = v
})

// key: [English, Thai]. A value can be a function of the params (for plurals).
const M = {
  // ── common ──
  'common.cancel': ['Cancel', 'ยกเลิก'],
  'common.close': ['Close', 'ปิด'],
  'common.delete': ['Delete', 'ลบ'],
  'common.edit': ['Edit', 'แก้ไข'],
  'common.save': ['Save', 'บันทึก'],
  'common.saving': ['Saving…', 'กำลังบันทึก…'],
  'common.saved': ['Saved', 'บันทึกแล้ว'],
  'common.added': ['Added', 'เพิ่มแล้ว'],
  'common.deleted': ['Deleted', 'ลบแล้ว'],
  'common.add': ['Add', 'เพิ่ม'],
  'common.addPlus': ['+ Add', '+ เพิ่ม'],
  'common.loading': ['Loading…', 'กำลังโหลด…'],
  'common.creating': ['Creating…', 'กำลังสร้าง…'],
  'common.all': ['All', 'ทั้งหมด'],
  'common.language': ['Language', 'ภาษา'],

  'role.admin': ['admin', 'ผู้ดูแลระบบ'],
  'role.manager': ['manager', 'ผู้จัดการข้อมูล'],
  'role.user': ['user', 'ผู้ใช้ทั่วไป'],

  // Paper fields, shared by tables, exports and forms
  'col.title': ['Title', 'ชื่อเรื่อง'],
  'col.authors': ['Authors', 'ผู้แต่ง'],
  'col.venue': ['Venue', 'แหล่งตีพิมพ์'],
  'col.year': ['Year', 'ปี'],
  'col.relevance': ['Relevance', 'ความเกี่ยวข้อง'],
  'col.caution': ['Caution', 'ข้อควรระวัง'],
  'col.domain': ['Domain', 'โดเมน'],
  'col.name': ['Name', 'ชื่อ'],
  'col.papers': ['Papers', 'บทความ'],
  'col.target': ['Target', 'เป้าหมาย'],
  'col.paper': ['Paper', 'บทความ'],

  // ── App shell ──
  'app.loadingData': ['Loading data…', 'กำลังโหลดข้อมูล…'],
  'tab.papers': ['Papers', 'บทความ'],
  'tab.compare': ['Comparison', 'ตารางเปรียบเทียบ'],
  'tab.domtbl': ['Domain Tables', 'ตารางตามโดเมน'],
  'tab.gaps': ['Gap Analysis', 'ช่องว่างงานวิจัย'],
  'tab.cite': ['Citations', 'การอ้างอิง'],
  'tab.stack': ['Pipeline', 'ไปป์ไลน์'],
  'tab.charts': ['Charts', 'แผนภูมิ'],
  'tab.rejected': ['Rejected Papers', 'บทความที่คัดออก'],
  'tab.manage': ['Manage Data', 'จัดการข้อมูล'],
  'tab.users': ['Users', 'ผู้ใช้'],
  'tab.audit': ['Audit Log', 'บันทึกการใช้งาน'],
  'side.overall': ['Overall coverage', 'ความครอบคลุมรวม'],
  'side.count': ['{n} / {target} papers ({pct}%)', 'บทความ {n} / {target} ({pct}%)'],
  'side.seeRejected': ['See Rejected Papers', 'ดูบทความที่คัดออก'],
  'side.breakdown': ['Read {read} · included {inc} · rejected {rej} · removed {rem}', 'อ่าน {read} · รับเข้า {inc} · คัดออก {rej} · ถอนออก {rem}'],
  'side.allDomains': ['All Domains', 'ทุกโดเมน'],
  'side.views': ['Views', 'มุมมอง'],
  'side.theme': ['Toggle light/dark theme', 'สลับธีมสว่าง/มืด'],
  'side.signOut': ['Sign out', 'ออกจากระบบ'],
  'side.updated': ['Updated: {date}', 'อัปเดต: {date}'],
  'side.stats': ['{d} domains · {g} gaps · {c} citations', '{d} โดเมน · {g} ช่องว่าง · {c} การอ้างอิง'],
  'title.allPapers': ['All Papers', 'บทความทั้งหมด'],
  'title.compare': ['Comparison Table', 'ตารางเปรียบเทียบ'],
  'title.domtbl': ['Domain Comparison Tables', 'ตารางเปรียบเทียบตามโดเมน'],
  'title.gaps': ['Gap Analysis', 'วิเคราะห์ช่องว่างงานวิจัย'],
  'title.cite': ['Citation Templates', 'ประโยคอ้างอิงสำเร็จรูป'],
  'title.charts': ['Corpus Charts', 'แผนภูมิคลังบทความ'],
  'papers.search': ['Search title, author, venue, tags...', 'ค้นหาชื่อเรื่อง ผู้แต่ง แหล่งตีพิมพ์ แท็ก...'],
  'papers.sort': ['Sort:', 'เรียงตาม:'],
  'papers.sortNum': ['Paper #', 'เลขบทความ'],
  'papers.expandAll': ['Expand all', 'ขยายทั้งหมด'],
  'papers.collapseAll': ['Collapse all', 'ย่อทั้งหมด'],
  'papers.noMatch': ['No papers match "{q}"', 'ไม่พบบทความที่ตรงกับ "{q}"'],

  // ── Sign-in ──
  'login.signIn': ['Sign in', 'เข้าสู่ระบบ'],
  'login.email': ['Email', 'อีเมล'],
  'login.password': ['Password', 'รหัสผ่าน'],
  'login.signingIn': ['Signing in…', 'กำลังเข้าสู่ระบบ…'],
  'login.continue': ['Continue', 'ดำเนินการต่อ'],
  'login.setupTitle': ['Set up two-factor authentication', 'ตั้งค่าการยืนยันตัวตนสองขั้นตอน'],
  'login.setupText': [
    'Every account needs a second factor. Scan this QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password, …), then enter the 6-digit code it shows.',
    'ทุกบัญชีต้องใช้การยืนยันตัวตนขั้นที่สอง สแกน QR code นี้ด้วยแอปยืนยันตัวตน (Google Authenticator, Microsoft Authenticator, Authy, 1Password, …) แล้วกรอกรหัส 6 หลักที่แอปแสดง',
  ],
  'login.qrAlt': ['QR code for your authenticator app', 'QR code สำหรับแอปยืนยันตัวตน'],
  'login.cantScan': ["Can't scan it? Enter this key in the app instead:", 'สแกนไม่ได้? กรอกคีย์นี้ในแอปแทน:'],
  'login.generating': ['Generating your key…', 'กำลังสร้างคีย์…'],
  'login.code6': ['6-digit code', 'รหัส 6 หลัก'],
  'login.checking': ['Checking…', 'กำลังตรวจสอบ…'],
  'login.turnOn': ['Turn on 2FA', 'เปิดใช้ 2FA'],
  'login.verifyTitle': ['Two-factor authentication', 'การยืนยันตัวตนสองขั้นตอน'],
  'login.backupText': ['Enter one of your backup codes. Each code works only once.', 'กรอกรหัสสำรองหนึ่งรหัส แต่ละรหัสใช้ได้ครั้งเดียว'],
  'login.backupCode': ['Backup code', 'รหัสสำรอง'],
  'login.verifyText': ['Enter the 6-digit code from your authenticator app.', 'กรอกรหัส 6 หลักจากแอปยืนยันตัวตน'],
  'login.verify': ['Verify', 'ยืนยัน'],
  'login.useApp': ['Use the authenticator app instead', 'ใช้แอปยืนยันตัวตนแทน'],
  'login.lostPhone': ['Lost your phone? Use a backup code', 'ทำโทรศัพท์หาย? ใช้รหัสสำรอง'],
  'login.back': ['Back to sign in', 'กลับไปหน้าเข้าสู่ระบบ'],
  'login.saveTitle': ['Save your backup codes', 'บันทึกรหัสสำรองของคุณ'],
  'login.saveText1': [
    '2FA is on. If you lose your phone, each of these codes lets you sign in once. Store them somewhere safe.',
    'เปิดใช้ 2FA แล้ว หากทำโทรศัพท์หาย รหัสแต่ละรหัสนี้ใช้เข้าสู่ระบบได้หนึ่งครั้ง เก็บไว้ในที่ปลอดภัย',
  ],
  'login.saveStrong': ["You won't see them again", 'รหัสเหล่านี้จะไม่แสดงอีก'],
  'login.saveText2': [', but you can make a new set from your account panel.', ' แต่คุณสร้างชุดใหม่ได้จากหน้าบัญชีของคุณ'],
  'login.saved': ["I've saved them, continue", 'บันทึกแล้ว ดำเนินการต่อ'],

  'bc.fileHeader': ['Backup codes (each works once)', 'รหัสสำรอง (แต่ละรหัสใช้ได้ครั้งเดียว)'],
  'bc.copied': ['Copied ✓', 'คัดลอกแล้ว ✓'],
  'bc.copyAll': ['Copy all', 'คัดลอกทั้งหมด'],
  'bc.download': ['Download .txt', 'ดาวน์โหลด .txt'],

  // ── Passwords and account ──
  'pw.mismatch': ['The new passwords do not match', 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'],
  'pw.temp': ['Temporary password', 'รหัสผ่านชั่วคราว'],
  'pw.new': ['New password (8–128 characters)', 'รหัสผ่านใหม่ (8–128 ตัวอักษร)'],
  'pw.confirm': ['Confirm new password', 'ยืนยันรหัสผ่านใหม่'],
  'pw.current': ['Current password', 'รหัสผ่านปัจจุบัน'],
  'fpc.title': ['Choose a new password', 'ตั้งรหัสผ่านใหม่'],
  'fpc.text1': ['You signed in as', 'คุณเข้าสู่ระบบในชื่อ'],
  'fpc.text2': ['with a temporary password. Choose your own password to continue.', 'ด้วยรหัสผ่านชั่วคราว กรุณาตั้งรหัสผ่านของคุณเองเพื่อดำเนินการต่อ'],
  'fpc.save': ['Save password', 'บันทึกรหัสผ่าน'],
  'acct.pwOk': ['Password updated. Your other sessions were signed out.', 'เปลี่ยนรหัสผ่านแล้ว อุปกรณ์อื่นที่เข้าสู่ระบบไว้ถูกออกจากระบบแล้ว'],
  'acct.title': ['Account', 'บัญชีของฉัน'],
  'acct.signedInAs': ['Signed in as', 'เข้าสู่ระบบในชื่อ'],
  'acct.twofa': ['Two-factor authentication', 'การยืนยันตัวตนสองขั้นตอน'],
  'acct.on': ['✓ On (authenticator app)', '✓ เปิดใช้อยู่ (แอปยืนยันตัวตน)'],
  'acct.codesLeft': ['{n} backup codes left', 'เหลือรหัสสำรอง {n} รหัส'],
  'acct.newCodesHint': [
    "Your new backup codes. The old ones no longer work. Save these now; they won't be shown again.",
    'รหัสสำรองชุดใหม่ของคุณ รหัสชุดเก่าใช้ไม่ได้แล้ว บันทึกไว้ตอนนี้เลย เพราะจะไม่แสดงอีก',
  ],
  'acct.replaceHint': ['This replaces all your current backup codes.', 'การสร้างใหม่จะแทนที่รหัสสำรองทั้งหมดที่มีอยู่'],
  'acct.createCodes': ['Create new codes', 'สร้างรหัสชุดใหม่'],
  'acct.newCodes': ['New backup codes', 'สร้างรหัสสำรองชุดใหม่'],
  'acct.lostHint': [
    'Lost your authenticator app and your backup codes? Ask an admin to reset your 2FA, then set it up again at your next sign-in.',
    'ทำแอปยืนยันตัวตนและรหัสสำรองหายทั้งคู่? ให้ผู้ดูแลระบบรีเซ็ต 2FA ให้ แล้วตั้งค่าใหม่ตอนเข้าสู่ระบบครั้งถัดไป',
  ],
  'acct.changePw': ['Change my password', 'เปลี่ยนรหัสผ่าน'],
  'acct.update': ['Update password', 'เปลี่ยนรหัสผ่าน'],

  // ── Users ──
  'users.roleUser': ['User: read only', 'ผู้ใช้ทั่วไป: ดูได้อย่างเดียว'],
  'users.roleManager': ['Manager: edit data, view users', 'ผู้จัดการข้อมูล: แก้ไขข้อมูล ดูรายชื่อผู้ใช้'],
  'users.roleAdmin': ['Admin: everything', 'ผู้ดูแลระบบ: ทำได้ทุกอย่าง'],
  'users.created': [
    "Created {email}. Give them the temporary password. They'll set up 2FA and choose their own password at first sign-in.",
    'สร้างบัญชี {email} แล้ว ส่งรหัสผ่านชั่วคราวให้เจ้าของบัญชี เจ้าของบัญชีจะตั้งค่า 2FA และตั้งรหัสผ่านเองตอนเข้าสู่ระบบครั้งแรก',
  ],
  'users.never': ['never', 'ยังไม่เคย'],
  'users.intro1': ["Every account must use two-factor authentication. An admin can't switch it off for anyone, only", 'ทุกบัญชีต้องใช้การยืนยันตัวตนสองขั้นตอน ผู้ดูแลระบบปิดให้ใครไม่ได้ ทำได้เพียง'],
  'users.intro2': ['reset', 'รีเซ็ต'],
  'users.intro3': ['it, which makes the person set it up again at their next sign-in.', 'ซึ่งทำให้เจ้าของบัญชีต้องตั้งค่าใหม่ตอนเข้าสู่ระบบครั้งถัดไป'],
  'users.viewOnly': ['You can view users; only admins can change them.', 'คุณดูรายชื่อผู้ใช้ได้ แต่แก้ไขได้เฉพาะผู้ดูแลระบบ'],
  'users.role': ['Role', 'บทบาท'],
  'users.status': ['Status', 'สถานะ'],
  'users.lastSignIn': ['Last sign-in', 'เข้าสู่ระบบล่าสุด'],
  'users.actions': ['Actions', 'จัดการ'],
  'users.you': ['you', 'คุณ'],
  'users.tempTitle': ["Signed in with a temporary password and hasn't replaced it yet", 'เข้าสู่ระบบด้วยรหัสผ่านชั่วคราวและยังไม่ได้เปลี่ยน'],
  'users.tempChip': ['temp password', 'รหัสผ่านชั่วคราว'],
  'users.roleChanged': ['{email} is now {role}', '{email} เป็น{role}แล้ว'],
  'users.lockedTitle': ['Too many wrong passwords. Resetting the password unlocks it.', 'ใส่รหัสผ่านผิดหลายครั้ง การรีเซ็ตรหัสผ่านจะปลดล็อกบัญชี'],
  'users.locked': ['locked', 'ถูกล็อก'],
  'users.disabled': ['disabled', 'ปิดใช้งาน'],
  'users.active': ['active', 'ใช้งานอยู่'],
  'users.on': ['on', 'เปิด'],
  'users.codes': ['{n} codes', '{n} รหัส'],
  'users.setupNext': ['setup at next sign-in', 'ตั้งค่าตอนเข้าสู่ระบบครั้งถัดไป'],
  'users.pwReset': ['Password reset for {email}. Temporary password: {pw}', 'รีเซ็ตรหัสผ่านของ {email} แล้ว รหัสผ่านชั่วคราว: {pw}'],
  'users.reset': ['Reset', 'รีเซ็ต'],
  'users.confirm2fa': ['Reset 2FA and sign them out?', 'รีเซ็ต 2FA และให้บัญชีนี้ออกจากระบบ?'],
  'users.twofaReset': ["2FA reset for {email}. They'll set it up again at next sign-in.", 'รีเซ็ต 2FA ของ {email} แล้ว เจ้าของบัญชีจะตั้งค่าใหม่ตอนเข้าสู่ระบบครั้งถัดไป'],
  'users.reset2fa': ['Reset 2FA', 'รีเซ็ต 2FA'],
  'users.confirmDelete': ['Delete this user?', 'ลบผู้ใช้นี้?'],
  'users.deleted': ['Deleted {email}', 'ลบ {email} แล้ว'],
  'users.disabledMsg': ['Disabled {email} and signed them out', 'ปิดใช้งาน {email} และให้ออกจากระบบแล้ว'],
  'users.disable': ['Disable', 'ปิดใช้งาน'],
  'users.enabledMsg': ['Enabled {email}', 'เปิดใช้งาน {email} แล้ว'],
  'users.enable': ['Enable', 'เปิดใช้งาน'],
  'users.resetPw': ['Reset password', 'รีเซ็ตรหัสผ่าน'],
  'users.useAccount': ['Use the account panel', 'ใช้หน้าบัญชีของฉัน'],
  'users.add': ['Add a user', 'เพิ่มผู้ใช้'],
  'users.generate': ['Generate', 'สุ่มรหัส'],
  'users.create': ['Create user', 'สร้างผู้ใช้'],

  // ── Audit log ──
  'audit.login_failed': ['Wrong password', 'รหัสผ่านผิด'],
  'audit.login_locked': ['Account locked', 'บัญชีถูกล็อก'],
  'audit.login_disabled': ['Sign-in to disabled account', 'พยายามเข้าบัญชีที่ปิดใช้งาน'],
  'audit.login_password_verified': ['Password OK, 2FA pending', 'รหัสผ่านถูกต้อง รอ 2FA'],
  'audit.2fa_setup_complete': ['2FA set up', 'ตั้งค่า 2FA แล้ว'],
  'audit.2fa_setup_failed': ['2FA setup code wrong', 'รหัสตั้งค่า 2FA ผิด'],
  'audit.2fa_verify_success': ['Signed in (2FA)', 'เข้าสู่ระบบ (2FA)'],
  'audit.2fa_verify_failed': ['2FA code wrong', 'รหัส 2FA ผิด'],
  'audit.2fa_backup_code_used': ['Signed in with backup code', 'เข้าสู่ระบบด้วยรหัสสำรอง'],
  'audit.password_changed': ['Password changed', 'เปลี่ยนรหัสผ่าน'],
  'audit.backup_codes_regenerated': ['New backup codes', 'สร้างรหัสสำรองชุดใหม่'],
  'audit.admin_user_created': ['User created', 'สร้างผู้ใช้'],
  'audit.admin_user_updated': ['User role/status changed', 'เปลี่ยนบทบาท/สถานะผู้ใช้'],
  'audit.admin_user_deleted': ['User deleted', 'ลบผู้ใช้'],
  'audit.admin_password_reset': ['Password reset by admin', 'ผู้ดูแลระบบรีเซ็ตรหัสผ่าน'],
  'audit.admin_2fa_reset': ['2FA reset by admin', 'ผู้ดูแลระบบรีเซ็ต 2FA'],
  'audit.data_saved': ['Data saved', 'บันทึกข้อมูล'],
  'audit.filter': ['Filter by email, event, IP…', 'กรองตามอีเมล เหตุการณ์ หรือ IP…'],
  'audit.refresh': ['Refresh', 'รีเฟรช'],
  'audit.note': ['Newest first · last 300 events', 'ล่าสุดอยู่บน · แสดง 300 รายการล่าสุด'],
  'audit.time': ['Time', 'เวลา'],
  'audit.event': ['Event', 'เหตุการณ์'],
  'audit.who': ['Who', 'ผู้ใช้'],
  'audit.details': ['Details', 'รายละเอียด'],
  'audit.none': ['No events', 'ไม่มีเหตุการณ์'],

  // ── Rejected papers ──
  'rej.statusRejected': ['Read, not included', 'อ่านแล้ว ไม่รับเข้า'],
  'rej.statusRemoved': ['Included, removed later', 'เคยรับเข้า ถอนออกภายหลัง'],
  'rej.included': ['Included', 'รับเข้า'],
  'rej.includedDesc': ['Read and met the criteria; counted in the corpus', 'อ่านแล้วผ่านเกณฑ์ นับอยู่ในคลังบทความ'],
  'rej.rejected': ['Rejected', 'คัดออก'],
  'rej.rejectedDesc': ['Read or screened but did not meet the criteria; never got a corpus number', 'อ่านหรือคัดกรองแล้วไม่ผ่านเกณฑ์ ไม่เคยได้เลขในคลังบทความ'],
  'rej.removed': ['Removed', 'ถอนออก'],
  'rej.removedDesc': ['Was included with a corpus number, then taken out later on editorial judgment', 'เคยรับเข้าและมีเลขในคลังบทความ แล้วถอนออกภายหลังตามดุลยพินิจ'],
  'rej.title': ['Rejected / Excluded Papers', 'บทความที่คัดออก / ไม่ได้รับเข้า'],
  'rej.subtitle': [
    'Papers read or screened during the search that did not make the final corpus. Kept so the selection process is transparent and nothing gets cited by accident.',
    'บทความที่อ่านหรือคัดกรองระหว่างการสืบค้นแต่ไม่ได้อยู่ในคลังบทความสุดท้าย เก็บไว้เพื่อให้กระบวนการคัดเลือกโปร่งใส และไม่เผลอนำไปอ้างอิง',
  ],
  'rej.allRead': ['All papers read', 'บทความที่อ่านทั้งหมด'],
  'rej.totalRead': ['{n} papers read in total', 'อ่านไปทั้งหมด {n} บทความ'],
  'rej.filter': ['{label} ({n})', '{label} ({n})'],
  'rej.freed': ['freed #{n}', 'คืนเลข #{n}'],
  'rej.empty': ['No papers in this category', 'ไม่มีบทความในหมวดนี้'],

  // ── Gap analysis ──
  'gap.p.critical': ['Critical', 'วิกฤต'],
  'gap.p.high': ['High', 'สูง'],
  'gap.p.medium': ['Medium', 'ปานกลาง'],
  'gap.p.low': ['Low', 'ต่ำ'],
  'gap.s.open': ['Still Open', 'ยังเปิดอยู่'],
  'gap.s.partial': ['Partially Closed', 'ปิดได้บางส่วน'],
  'gap.s.closed': ['Covered — Stop', 'ครอบคลุมแล้ว — หยุดค้น'],
  'gap.title': ['Research Gap Analysis', 'วิเคราะห์ช่องว่างงานวิจัย'],
  'gap.subtitle': [
    '{n} gaps. Each status says whether the gap is still open, partly covered by the literature, or closed with enough evidence.',
    '{n} ช่องว่าง สถานะบอกว่าช่องว่างยังเปิดอยู่ วรรณกรรมครอบคลุมบางส่วน หรือปิดแล้วเพราะมีหลักฐานเพียงพอ',
  ],
  'gap.f.openPartial': ['Open / Partial', 'เปิด / บางส่วน'],
  'gap.f.closed': ['Closed', 'ปิดแล้ว'],
  'gap.evidence': ['Evidence in corpus', 'หลักฐานในคลังบทความ'],
  'gap.action': ['Action', 'สิ่งที่ต้องทำ'],
  'gap.opportunity': ['Opportunity', 'โอกาสสำหรับงานวิจัย'],
  'gap.search': ['Search guidance', 'แนวทางการสืบค้น'],

  // ── Paper card ──
  'card.caution': ['⚠️ cite with caution', '⚠️ อ้างอิงอย่างระมัดระวัง'],
  'card.what': ['What', 'ทำอะไร'],
  'card.how': ['How', 'ทำอย่างไร'],
  'card.results': ['Results', 'ผลลัพธ์'],
  'card.usage': ['Usage in thesis', 'การใช้ในวิทยานิพนธ์'],
  'card.pdf': ['⬇ Download PDF', '⬇ ดาวน์โหลด PDF'],

  // ── Citations ──
  'cite.subtitle': ['Ready-to-paste citation sentences. Click Copy on any block.', 'ประโยคอ้างอิงพร้อมวาง กด "คัดลอก" ที่กล่องใดก็ได้'],
  'cite.copy': ['Copy', 'คัดลอก'],
  'cite.copied': ['✓ Copied', '✓ คัดลอกแล้ว'],

  // ── Domain tables ──
  'dt.cautionCell': ['cite with caution', 'อ้างอิงอย่างระมัดระวัง'],
  'dt.papersNow': ['Papers Now', 'บทความปัจจุบัน'],
  'dt.pctTarget': ['% of Target', '% ของเป้าหมาย'],
  'dt.avgRelevance': ['Avg Relevance', 'ความเกี่ยวข้องเฉลี่ย'],
  'dt.summary': ['Summary', 'สรุป'],
  'dt.subtitle': ['Papers grouped by domain — export any table to a real .xlsx workbook.', 'บทความจัดกลุ่มตามโดเมน ส่งออกตารางใดก็ได้เป็นไฟล์ Excel (.xlsx)'],
  'dt.exportAll': ['⬇ Export All to Excel (.xlsx)', '⬇ ส่งออกทั้งหมดเป็น Excel (.xlsx)'],
  'dt.exportSheet': ['⬇ Export sheet', '⬇ ส่งออกชีตนี้'],
  'dt.cautionBadge': ['caution', 'ระวัง'],
  'dt.empty': ['No papers in this domain yet', 'ยังไม่มีบทความในโดเมนนี้'],
  'dt.note': [
    '"Export All" produces one workbook with a Summary sheet + one sheet per domain. Each domain block also has its own single-sheet export.',
    '"ส่งออกทั้งหมด" จะได้ไฟล์เดียวที่มีชีตสรุปและชีตแยกของแต่ละโดเมน แต่ละโดเมนยังส่งออกเป็นชีตเดียวแยกได้ด้วย',
  ],

  // ── Comparison tables ──
  'dct.title': ['Comparison Tables — By Domain', 'ตารางเปรียบเทียบ — แยกตามโดเมน'],
  'dct.subtitle': ['Same {n}-dimension rubric applied to every paper, grouped by domain.', 'ใช้เกณฑ์ {n} มิติเดียวกันกับทุกบทความ จัดกลุ่มตามโดเมน'],
  'dct.exportPng': ['⬇ Export All as PNG', '⬇ ส่งออกทั้งหมดเป็น PNG'],
  'dct.exportJpg': ['⬇ Export All as JPG', '⬇ ส่งออกทั้งหมดเป็น JPG'],
  'dct.papers': ['{n} papers', '{n} บทความ'],
  'dct.sheet': ['⬇ Sheet', '⬇ ชีต'],
  'dct.dimension': ['Dimension', 'มิติ'],
  'dct.yes': ['Yes', 'ใช่'],
  'dct.no': ['No', 'ไม่ใช่'],
  'dct.partial': ['Partial', 'บางส่วน'],
  'dct.note': ['Note', 'หมายเหตุ'],

  // ── Charts ──
  'ch.subtitle': [
    'Papers per domain and the spread of relevance scores across the corpus ({n}/{target} papers)',
    'จำนวนบทความต่อโดเมน และการกระจายของคะแนนความเกี่ยวข้องในคลังบทความ ({n}/{target} บทความ)',
  ],
  'ch.perDomain': ['Papers per Domain', 'จำนวนบทความต่อโดเมน'],
  'ch.perDomainSub': ['Solid bar = current count · dashed line = target ({target} papers in total)', 'แท่งทึบ = จำนวนปัจจุบัน · เส้นประ = เป้าหมาย (รวม {target} บทความ)'],
  'ch.chartView': ['Chart view', 'ดูเป็นแผนภูมิ'],
  'ch.tableView': ['Table view', 'ดูเป็นตาราง'],
  'ch.domainAria': ['Papers per domain bar chart', 'แผนภูมิแท่งจำนวนบทความต่อโดเมน'],
  'ch.barAria': ['{name}: {n} of {target} papers', '{name}: {n} จาก {target} บทความ'],
  'ch.domainTip': ['{n} / {target} papers ({pct}% of target)', '{n} / {target} บทความ ({pct}% ของเป้าหมาย)'],
  'ch.scoreDist': ['Relevance Score Distribution', 'การกระจายคะแนนความเกี่ยวข้อง'],
  'ch.scoreSub': ['Papers per relevance score (1–10), {n} papers in the corpus', 'จำนวนบทความต่อคะแนนความเกี่ยวข้อง (1–10) จากคลังบทความ {n} บทความ'],
  'ch.scoreAria': ['Relevance score distribution bar chart', 'แผนภูมิแท่งการกระจายคะแนนความเกี่ยวข้อง'],
  'ch.scoreBarAria': ['Score {s}: {n} papers', 'คะแนน {s}: {n} บทความ'],
  'ch.scoreTip': ['Score {s}/10', 'คะแนน {s}/10'],
  'ch.scoreTipRow': ['{n} papers ({pct}% of corpus)', '{n} บทความ ({pct}% ของคลังบทความ)'],
  'ch.score': ['Score', 'คะแนน'],

  // ── Pipeline ──
  'cs.cross': ['⊗ Cross-Cutting', '⊗ ประเด็นร่วมทุกขั้น'],

  // ── Manage Data ──
  'md.intro1': [
    'Everything you edit here is saved straight into the JSON files in the data folder. The previous version of each file is kept next to it as',
    'ทุกอย่างที่แก้ไขที่นี่จะบันทึกลงไฟล์ JSON ในโฟลเดอร์ data ทันที และเก็บไฟล์เวอร์ชันก่อนหน้าไว้ข้างกันเป็น',
  ],
  'md.sec.domains': ['Domains', 'โดเมน'],
  'md.sec.gaps': ['Gaps', 'ช่องว่าง'],
  'md.sec.rejected': ['Rejected', 'คัดออก'],
  'md.sec.settings': ['Settings', 'ตั้งค่า'],
  'md.f.appTitle': ['App title', 'ชื่อแอป'],
  'md.f.icon': ['Icon', 'ไอคอน'],
  'md.f.iconHint': ['One emoji, shown next to the title', 'อีโมจิหนึ่งตัว แสดงข้างชื่อแอป'],
  'md.f.subtitle': ['Subtitle', 'คำบรรยายใต้ชื่อ'],
  'md.f.subtitleHint': ['For example your thesis topic', 'เช่น หัวข้อวิทยานิพนธ์ของคุณ'],
  'md.f.pipelineTitle': ['Pipeline heading', 'หัวข้อหน้าไปป์ไลน์'],
  'md.f.pipelineSubtitle': ['Pipeline subheading', 'คำบรรยายหน้าไปป์ไลน์'],
  'md.f.domainId': ['Domain number', 'หมายเลขโดเมน'],
  'md.f.domainIdHint': ['Shown as D1, D2, … Papers point at this number.', 'แสดงเป็น D1, D2, … บทความอ้างถึงหมายเลขนี้'],
  'md.f.shortName': ['Short name', 'ชื่อย่อ'],
  'md.f.fullName': ['Full name', 'ชื่อเต็ม'],
  'md.f.slug': ['Slug', 'Slug'],
  'md.f.slugHint': ['Lowercase, digits and "-". PDFs go in papers/<slug>/', 'ใช้ได้เฉพาะตัวพิมพ์เล็ก ตัวเลข และ "-" ไฟล์ PDF อยู่ใน papers/<slug>/'],
  'md.f.color': ['Color', 'สี'],
  'md.f.target': ['Target paper count', 'จำนวนบทความเป้าหมาย'],
  'md.f.description': ['Description', 'คำอธิบาย'],
  'md.f.keywords': ['Search keywords', 'คำค้น'],
  'md.f.keywordsHint': ['One search string per line, the ones you use in Scopus / Google Scholar', 'บรรทัดละหนึ่งคำค้น ตามที่ใช้ค้นใน Scopus / Google Scholar'],
  'md.f.paperId': ['Paper number', 'เลขบทความ'],
  'md.f.paperIdHint': ['Unique across all domains. Must match NN in the PDF file name.', 'ห้ามซ้ำกันในทุกโดเมน ต้องตรงกับ NN ในชื่อไฟล์ PDF'],
  'md.f.relevance': ['Relevance (1–10)', 'ความเกี่ยวข้อง (1–10)'],
  'md.f.authorsPh': ['Zhou et al.', 'Zhou et al.'],
  'md.f.venuePh': ['Journal or conference', 'วารสารหรืองานประชุมวิชาการ'],
  'md.f.yearHint': ['Publication year (CE), as in the citation', 'ปี ค.ศ. ที่ตีพิมพ์ ตามที่ใช้ในการอ้างอิง'],
  'md.f.caution': ['⚠️ Cite with caution', '⚠️ อ้างอิงอย่างระมัดระวัง'],
  'md.f.what': ['What: the paper in one or two sentences', 'ทำอะไร: สรุปบทความในหนึ่งถึงสองประโยค'],
  'md.f.how': ['How: method', 'ทำอย่างไร: วิธีการ'],
  'md.f.usage': ['Usage: where you will cite it and why', 'การใช้: จะอ้างอิงที่ไหนและเพราะอะไร'],
  'md.f.tags': ['Tags', 'แท็ก'],
  'md.f.gapId': ['Gap ID', 'รหัสช่องว่าง'],
  'md.f.priority': ['Priority', 'ความสำคัญ'],
  'md.f.status': ['Status', 'สถานะ'],
  'md.f.gapOpen': ['open: still a gap', 'เปิด: ยังเป็นช่องว่าง'],
  'md.f.gapPartial': ['partial: partly covered', 'บางส่วน: ครอบคลุมบางส่วน'],
  'md.f.gapClosed': ['closed: covered', 'ปิด: ครอบคลุมแล้ว'],
  'md.f.evidence': ['Evidence', 'หลักฐาน'],
  'md.f.evidenceHint': ['One point per line, e.g. "Paper 04: no decision layer"', 'บรรทัดละหนึ่งประเด็น เช่น "บทความ 04: ไม่มีชั้นการตัดสินใจ"'],
  'md.f.opportunity': ['Opportunity for your study', 'โอกาสสำหรับงานวิจัยของคุณ'],
  'md.f.searchHint': ['What to search next to close this gap', 'ควรค้นอะไรต่อเพื่อปิดช่องว่างนี้'],
  'md.f.where': ['Where it goes', 'ใช้ในส่วนไหน'],
  'md.f.wherePh': ['Chapter 2: Related work', 'บทที่ 2: งานวิจัยที่เกี่ยวข้อง'],
  'md.f.label': ['Label', 'ป้ายชื่อ'],
  'md.f.labelPh': ['Zhou et al. (2021): long-horizon Transformer', 'Zhou et al. (2021): long-horizon Transformer'],
  'md.f.citeText': ['Citation sentence', 'ประโยคอ้างอิง'],
  'md.f.step': ['Step', 'ขั้นที่'],
  'md.f.stepHint': ['1, 2, 3… in order. Use 0 for one cross-cutting concern.', '1, 2, 3… ตามลำดับ ใช้ 0 สำหรับประเด็นร่วมทุกขั้น (มีได้รายการเดียว)'],
  'md.f.stepLabel': ['Label', 'ชื่อ'],
  'md.f.sublabel': ['Sublabel', 'คำบรรยายรอง'],
  'md.f.none': ['(none)', '(ไม่มี)'],
  'md.f.paperNums': ['Paper numbers', 'เลขบทความ'],
  'md.f.note': ['Note', 'หมายเหตุ'],
  'md.f.id': ['ID', 'รหัส'],
  'md.f.rejRejected': ['rejected: read, never included', 'คัดออก: อ่านแล้ว ไม่เคยรับเข้า'],
  'md.f.rejRemoved': ['removed: included, then taken out', 'ถอนออก: เคยรับเข้า แล้วถอนออก'],
  'md.f.batch': ['Batch', 'รอบ'],
  'md.f.batchHint': ['Which search or screening round', 'มาจากการสืบค้นหรือการคัดกรองรอบไหน'],
  'md.f.freed': ['Freed paper number', 'เลขบทความที่คืน'],
  'md.f.freedHint': ['For "removed": the number it had in the corpus', 'สำหรับ "ถอนออก": เลขที่เคยมีในคลังบทความ'],
  'md.f.reason': ['Reason for excluding', 'เหตุผลที่คัดออก'],
  'md.citeExists': ['Paper #{id} already has a citation. Edit that one instead.', 'บทความ #{id} มีการอ้างอิงอยู่แล้ว ให้แก้ไขรายการเดิมแทน'],
  'md.needDomain': ['Add a domain first. Every paper belongs to one.', 'เพิ่มโดเมนก่อน บทความทุกบทความต้องอยู่ในโดเมนใดโดเมนหนึ่ง'],
  'md.needPaper': ['Add a paper first. Each citation belongs to one paper.', 'เพิ่มบทความก่อน การอ้างอิงแต่ละรายการต้องผูกกับบทความหนึ่งบทความ'],
  'md.addPaper': ['+ Add paper', '+ เพิ่มบทความ'],
  'md.addDomain': ['+ Add domain', '+ เพิ่มโดเมน'],
  'md.addGap': ['+ Add gap', '+ เพิ่มช่องว่าง'],
  'md.addCitation': ['+ Add citation', '+ เพิ่มการอ้างอิง'],
  'md.addStep': ['+ Add step', '+ เพิ่มขั้น'],
  'md.addRejected': ['+ Add rejected paper', '+ เพิ่มบทความที่คัดออก'],
  'md.paperMeta': ['{domain} · {authors} · {venue} {year} · relevance {score}/10', '{domain} · {authors} · {venue} {year} · ความเกี่ยวข้อง {score}/10'],
  'md.paperFoot': [
    'Deleting a paper also removes its citation, comparison scores and pipeline references.',
    'การลบบทความจะลบการอ้างอิง คะแนนในตารางเปรียบเทียบ และการอ้างถึงในไปป์ไลน์ของบทความนั้นด้วย',
  ],
  'md.domainMeta': ['{n} / {target} papers · {slug}', '{n} / {target} บทความ · {slug}'],
  'md.gapMeta': ['{p} priority · {s}', 'ความสำคัญ{p} · {s}'],
  'md.citePaper': ['Paper #{id}', 'บทความ #{id}'],
  'md.crossCutting': ['Cross-cutting', 'ประเด็นร่วมทุกขั้น'],
  'md.step': ['Step {n}', 'ขั้นที่ {n}'],
  'md.stepPapers': ['papers {list}', 'บทความ {list}'],

  'ce.wholeNumbers': ['{label}: use whole numbers separated by commas', '{label}: ใช้จำนวนเต็มคั่นด้วยจุลภาค'],
  'ce.filter': ['Filter…', 'กรอง…'],
  'ce.count': [(p) => `${p.n} item${p.n === 1 ? '' : 's'}`, '{n} รายการ'],
  'ce.untitled': ['(untitled)', '(ไม่มีชื่อ)'],
  'ce.confirmDelete': ['Delete this item?', 'ลบรายการนี้?'],
  'ce.noMatch': ['Nothing matches the filter', 'ไม่มีรายการที่ตรงกับตัวกรอง'],
  'ce.empty': ['Nothing here yet', 'ยังไม่มีรายการ'],

  'if.positive': ['Positive', 'เชิงบวก'],
  'if.warning': ['Warning', 'คำเตือน'],
  'if.neutral': ['Neutral', 'ทั่วไป'],
  'if.onePerLine': ['One per line', 'บรรทัดละหนึ่งรายการ'],
  'if.numbersPh': ['e.g. 1, 2, 5', 'เช่น 1, 2, 5'],
  'if.tagLabel': ['Tag label', 'ข้อความแท็ก'],
  'if.tagType': ['Tag type', 'ชนิดแท็ก'],
  'if.addTag': ['+ Tag', '+ แท็ก'],

  'cmp.confirmRemove': ['Remove "{name}" and every score in that column?', 'ลบ "{name}" และคะแนนทั้งหมดในคอลัมน์นี้?'],
  'cmp.thisDimension': ['this dimension', 'มิตินี้'],
  'cmp.needName': ['Every dimension needs a name', 'ทุกมิติต้องมีชื่อ'],
  'cmp.dims': ['Rubric dimensions', 'มิติของเกณฑ์ประเมิน'],
  'cmp.dimsHint': ['The columns every paper is scored on, such as "Uses real-world data".', 'คอลัมน์ที่ใช้ประเมินทุกบทความ เช่น "ใช้ข้อมูลจริง"'],
  'cmp.dimName': ['Dimension name', 'ชื่อมิติ'],
  'cmp.up': ['Move up', 'เลื่อนขึ้น'],
  'cmp.down': ['Move down', 'เลื่อนลง'],
  'cmp.remove': ['Remove', 'ลบ'],
  'cmp.addDim': ['+ Dimension', '+ มิติ'],
  'cmp.scores': ['Scores', 'คะแนน'],
  'cmp.scoresHint': [
    'Pick a domain, then set each paper\'s status and an optional short note per dimension. Leave "No" with no note for an empty cell.',
    'เลือกโดเมน แล้วกำหนดสถานะของแต่ละบทความในแต่ละมิติ ใส่หมายเหตุสั้น ๆ ได้ถ้าต้องการ ถ้าต้องการช่องว่าง ให้เลือก "ไม่ใช่" และไม่ใส่หมายเหตุ',
  ],
  'cmp.needDim': ['Add at least one dimension first.', 'เพิ่มอย่างน้อยหนึ่งมิติก่อน'],
  'cmp.noPapers': ['This domain has no papers yet.', 'โดเมนนี้ยังไม่มีบทความ'],
  'cmp.unnamed': ['(unnamed)', '(ไม่มีชื่อ)'],
  'cmp.notePh': ['note', 'หมายเหตุ'],
  'cmp.save': ['Save comparison', 'บันทึกตารางเปรียบเทียบ'],
  'cmp.discard': ['Discard changes', 'ยกเลิกการแก้ไข'],
  'cmp.unsaved': ['Unsaved changes', 'มีการแก้ไขที่ยังไม่บันทึก'],
}

function translate(code, key, params = {}) {
  const entry = M[key]
  if (!entry) return key
  let v = entry[code === 'th' ? 1 : 0] ?? entry[0]
  if (typeof v === 'function') v = v(params)
  return v.replace(/\{(\w+)\}/g, (m, k) => (params[k] ?? m))
}

// In components: $t('key', { param: value }). Re-renders when the language changes.
export const t = derived(lang, (code) => (key, params) => translate(code, key, params))

// Dates: Thai uses the Buddhist Era (พ.ศ.), which is the default calendar of the th-TH locale.
const LOCALES = { th: 'th-TH', en: 'en-GB' }
function toDate(v) {
  // 'YYYY-MM-DD' is read as a local date, not UTC midnight, so it never shifts a day.
  const m = typeof v === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v)
}
export const fmtDate = derived(lang, (code) => (v) =>
  v ? toDate(v).toLocaleDateString(LOCALES[code], { day: 'numeric', month: 'short', year: 'numeric' }) : '')
export const fmtDateTime = derived(lang, (code) => (v) =>
  v ? toDate(v).toLocaleString(LOCALES[code], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')

// Server error messages arrive in English. The server keeps one wording per error (the API tests
// check it), so they are translated here; anything not listed is shown as sent.
const SERVER_ERRORS_TH = [
  ['Invalid paper id', 'เลขบทความไม่ถูกต้อง'],
  ['No PDF for this paper', 'ไม่มีไฟล์ PDF ของบทความนี้'],
  ['Unknown collection', 'ไม่รู้จักชุดข้อมูลนี้'],
  [/^Cannot write to (.+?)\. Make sure the data folder is writable.*$/s, 'เขียนไฟล์ลง $1 ไม่ได้ ตรวจสอบว่าโฟลเดอร์ data เขียนได้ (ไม่ได้ mount แบบอ่านอย่างเดียว)'],
  ['Not found', 'ไม่พบข้อมูล'],
  ['Request too large', 'คำขอมีขนาดใหญ่เกินไป'],
  ['Something went wrong', 'เกิดข้อผิดพลาด'],
  ['Your sign-in step expired. Please sign in again.', 'ขั้นตอนเข้าสู่ระบบหมดเวลา กรุณาเข้าสู่ระบบใหม่'],
  ['Please sign in again.', 'กรุณาเข้าสู่ระบบใหม่'],
  ['Not authenticated', 'ยังไม่ได้เข้าสู่ระบบ'],
  ['You must change your password first', 'ต้องเปลี่ยนรหัสผ่านก่อน'],
  ['You do not have permission to do this', 'คุณไม่มีสิทธิ์ทำรายการนี้'],
  ['Cross-site request blocked', 'ระบบบล็อกคำขอที่มาจากเว็บไซต์อื่น'],
  ['User not found', 'ไม่พบผู้ใช้'],
  ['Email and password are required', 'กรุณากรอกอีเมลและรหัสผ่าน'],
  ['Invalid email or password', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'],
  [/^Account temporarily locked after repeated failed attempts\. Try again in (\d+) minutes.*$/s, 'บัญชีถูกล็อกชั่วคราวเพราะใส่รหัสผ่านผิดหลายครั้ง ลองใหม่ใน $1 นาที หรือให้ผู้ดูแลระบบรีเซ็ตรหัสผ่าน'],
  ['This account has been disabled. Contact an administrator.', 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ'],
  ['No 2FA setup in progress. Please start again.', 'ไม่มีการตั้งค่า 2FA ที่ค้างอยู่ กรุณาเริ่มใหม่'],
  ['Invalid verification code', 'รหัสยืนยันไม่ถูกต้อง'],
  ['Invalid or already used verification code', 'รหัสยืนยันไม่ถูกต้องหรือถูกใช้ไปแล้ว'],
  ['Current password is incorrect', 'รหัสผ่านปัจจุบันไม่ถูกต้อง'],
  ['Choose a password different from the current one', 'กรุณาตั้งรหัสผ่านที่ต่างจากรหัสผ่านเดิม'],
  ['Too many requests. Please slow down.', 'มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่'],
  ['Too many sign-in attempts. Please try again later.', 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง'],
  ['Too many verification attempts. Please try again later.', 'ยืนยันรหัสหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง'],
  ['Password must be 8 to 128 characters', 'รหัสผ่านต้องยาว 8 ถึง 128 ตัวอักษร'],
  ['A valid email is required', 'กรุณากรอกอีเมลที่ถูกต้อง'],
  [/^Role must be one of.*$/s, 'บทบาทต้องเป็น admin, manager หรือ user'],
  ['A user with that email already exists', 'มีผู้ใช้อีเมลนี้อยู่แล้ว'],
  ['Status must be active or disabled', 'สถานะต้องเป็นใช้งานอยู่หรือปิดใช้งาน'],
  ['You cannot remove your own admin access or disable your own account', 'คุณถอดสิทธิ์ผู้ดูแลระบบของตัวเองหรือปิดใช้งานบัญชีตัวเองไม่ได้'],
  ['At least one active admin must remain', 'ต้องมีผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อยหนึ่งคน'],
  ['You cannot delete your own account while signed in', 'คุณลบบัญชีตัวเองขณะเข้าสู่ระบบอยู่ไม่ได้'],
  ['Cannot delete the last active admin', 'ลบผู้ดูแลระบบคนสุดท้ายที่ใช้งานอยู่ไม่ได้'],
  [/^Cannot remove a domain that still has papers \(paper (.+?)\).*$/s, 'ลบโดเมนที่ยังมีบทความอยู่ไม่ได้ (บทความ $1) ย้ายหรือลบบทความเหล่านั้นก่อน'],
  [/^Only one pipeline layer can use step 0.*$/s, 'มีขั้น 0 (ประเด็นร่วมทุกขั้น) ได้เพียงรายการเดียว'],
  [/^Duplicate (.+?): (.+)$/, '$1 ซ้ำ: $2'],
  [/^(.+) is required$/, 'ต้องกรอก $1'],
  [/^(.+) must be a whole number(?: from (-?\d+))?(?: to (-?\d+))?$/, (m, what, from, to) =>
    `${what} ต้องเป็นจำนวนเต็ม${from !== undefined ? ` ตั้งแต่ ${from}` : ''}${to !== undefined ? ` ถึง ${to}` : ''}`],
  [/^(.+) must be a list$/, '$1 ต้องเป็นรายการ'],
  [/^Request failed \((\d+)\)$/, 'คำขอไม่สำเร็จ ($1)'],
]

export function translateServerError(message) {
  if (get(lang) !== 'th' || !message) return message
  for (const [pattern, th] of SERVER_ERRORS_TH) {
    if (typeof pattern === 'string') {
      if (message === pattern) return th
    } else if (pattern.test(message)) {
      return message.replace(pattern, th) // every pattern matches the whole message
    }
  }
  return message
}
