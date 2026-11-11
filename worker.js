/**
 * Cloudflare Worker - Single Product Landing Page + Order System + Admin Panel
 * D1 binding name: DB
 * Secrets: DATA_KEY, FCM_SERVICE_ACCOUNT, ADMIN_DEFAULT_USER, ADMIN_DEFAULT_PASS
 * Variable: FCM_PROJECT_ID
 */

function defaultAdmin(env) {
  return { user: env.ADMIN_DEFAULT_USER || "", pass: env.ADMIN_DEFAULT_PASS || "" };
}

const STATUSES = ["Pending", "Confirmed", "Delivered", "Cancelled"];
const RATIOS = ["auto", "1:1", "4:5", "3:4", "4:3", "16:9"];
const BADGE_POS = ["tl", "tr", "bl", "br"];
const TOPBAR_ALIGN = ["left", "center", "right"];
const NOTICE_ALIGN = ["left", "center", "right"];
const MAX_IMAGES = 8;
const MAX_IMAGES_BYTES = 900 * 1024;
const MAX_NOTICES = 3;
const MAX_NOTICES_BYTES = 500 * 1024;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_PRODUCT_BODY = 1536 * 1024;
const MAX_TRUST = 3;
const MAX_FAQ = 10;
const MAX_QTY = 20;
const PAGE_SIZE = 30;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PBKDF2_ITER = 100000;
const LOGIN_FAIL_LIMIT = 20;
const LOGIN_IP_FAIL_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ORDER_IP_LIMIT = 25;
const PHONE_ATTEMPT_LIMIT = 12;
const ORDER_WINDOW_MS = 60 * 60 * 1000;
const PHONE_ORDER_LIMIT = 5;
const COUPON_REWARD_DAYS = 30;
const LOW_STOCK = 5;
const ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const PUBLIC_ID_RE = /^NL-[2-9A-HJKMNP-TV-Z]{5}-[2-9A-HJKMNP-TV-Z]{5}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const NOTICE_FONT_CSS = {
  sans: "'Segoe UI', Roboto, 'Noto Sans Bengali', sans-serif",
  serif: "Georgia, 'Times New Roman', 'Noto Serif Bengali', serif",
  mono: "ui-monospace, Menlo, Consolas, monospace",
  display: "Impact, 'Arial Black', 'Noto Sans Bengali', sans-serif"
};

const DEFAULT_TRUST = [
  { icon: "💵", bn: "ক্যাশ অন ডেলিভারি", en: "Cash on delivery" },
  { icon: "🔁", bn: "৭ দিন রিপ্লেসমেন্ট", en: "7-day replacement" },
  { icon: "✅", bn: "১০০% অরিজিনাল", en: "100% original" }
];

const DEFAULT_FAQS = [
  { qbn: "ডেলিভারি কত দিনে হবে?", qen: "How long does delivery take?",
    abn: "ঢাকার ভেতরে সাধারণত ১-২ দিন, ঢাকার বাইরে ৩-৫ দিন।", aen: "Inside Dhaka usually 1–2 days, outside Dhaka 3–5 days." },
  { qbn: "পণ্য পছন্দ না হলে?", qen: "What if I'm not happy with the product?",
    abn: "হাতে পাওয়ার ৭ দিনের মধ্যে সমস্যা হলে রিপ্লেসমেন্ট পাবেন।", aen: "If there is a problem within 7 days of delivery, you get a replacement." },
  { qbn: "টাকা কীভাবে দেব?", qen: "How do I pay?",
    abn: "পণ্য হাতে পেয়ে ক্যাশে টাকা দিন। আগে কোনো পেমেন্ট লাগবে না।", aen: "Pay cash when you receive the product. No advance payment needed." }
];

let schemaReady = false;

/* ============================================================
   Website strings  [বাংলা, English]  — ওয়েবসাইট ডিফল্টে বাংলা
   ============================================================ */

const LANDING_STRINGS = {
  topbar: ["⚡ সীমিত সময়ের অফার! সারাদেশে ক্যাশ অন ডেলিভারি", "⚡ Limited-time offer! Cash on delivery nationwide"],
  in_stock: ["✅ স্টকে আছে", "✅ In stock"],
  out_stock: ["❌ স্টক আউট", "❌ Out of stock"],
  off: ["ছাড়", "OFF"],
  about_title: ["প্রোডাক্ট সম্পর্কে", "About this product"],
  faq_title: ["সাধারণ প্রশ্ন ও উত্তর", "Frequently asked questions"],
  call: ["📞 সরাসরি কল করুন", "📞 Call now"],
  wa: ["💬 WhatsApp চ্যাট", "💬 WhatsApp chat"],
  buy_now: ["অর্ডার করুন", "Order now"],
  delivery_note: ["ডেলিভারি চার্জ আলাদা", "Delivery charge extra"],
  form_title: ["অর্ডার করতে নিচের ফর্মটি পূরণ করুন", "Fill in the form to place your order"],
  l_name: ["আপনার নাম *", "Your name *"],
  ph_name: ["সম্পূর্ণ নাম লিখুন", "Enter your full name"],
  l_phone: ["মোবাইল নাম্বার *", "Mobile number *"],
  l_address: ["সম্পূর্ণ ঠিকানা *", "Full address *"],
  ph_address: ["বাসা নং, রোড, থানা, জেলা", "House, road, area, district"],
  l_color: ["কালার সিলেক্ট করুন *", "Select color *"],
  l_size: ["সাইজ সিলেক্ট করুন *", "Select size *"],
  l_area: ["ডেলিভারি এরিয়া *", "Delivery area *"],
  area_in: ["ঢাকার ভেতরে", "Inside Dhaka"],
  area_out: ["ঢাকার বাইরে", "Outside Dhaka"],
  l_qty: ["পরিমাণ:", "Quantity:"],
  l_subtotal: ["প্রোডাক্টের দাম:", "Product price:"],
  l_delivery: ["ডেলিভারি চার্জ:", "Delivery charge:"],
  select_first: ["সিলেক্ট করুন", "Select"],
  l_total: ["সর্বমোট বিল:", "Total:"],
  plus_delivery: ["+ ডেলিভারি", "+ delivery"],
  submit: ["অর্ডার কনফার্ম করুন ➔", "Confirm order ➔"],
  submitting: ["প্রসেসিং হচ্ছে...", "Processing..."],
  hint: ["সব তথ্য পূরণ করলে অর্ডার কনফার্ম বাটন চালু হবে।", "The confirm button activates once all fields are filled."],
  success: ["🎉 ধন্যবাদ! আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।\nখুব শীঘ্রই আমাদের প্রতিনিধি আপনাকে কল করবেন।", "🎉 Thank you! Your order has been received.\nOur representative will call you shortly."],
  back_product: ["অর্ডার সম্পন্ন হয়েছে", "Order completed"],
  coupon_label: ["কুপন কোড (থাকলে)", "Coupon code (if you have one)"],
  coupon_ph: ["কুপন কোড লিখুন", "Enter coupon code"],
  coupon_row: ["কুপন ছাড় ({p}%)", "Coupon discount ({p}%)"],
  coupon_ok: ["কুপন প্রয়োগ হয়েছে, {p}% ছাড়", "Coupon applied, {p}% off"],
  coupon_pending: ["ফোন নাম্বার দিলে কুপনটি যাচাই হবে।", "Enter your phone number to verify this coupon."],
  bulk_row: ["বাল্ক ছাড় ({n}+ টি)", "Bulk discount ({n}+ pcs)"],
  bulk_hint: ["{n} টি বা তার বেশি নিলে {v} ছাড়!", "Buy {n} or more and get {v} off!"],
  copy_btn: ["📋 কপি করুন", "📋 Copy"],
  copied_btn: ["✅ কপি হয়েছে", "✅ Copied"],
  reward_title: ["🎁 আপনার পরবর্তী অর্ডারের কুপন", "🎁 Coupon for your next order"],
  reward_note: ["এই কোডে {p}% ছাড় পাবেন। মেয়াদ {d} দিন। কোডটি একবারই ব্যবহার করা যাবে।", "Get {p}% off with this code. Valid {d} days, one-time use."],
  oid_label: ["অর্ডার আইডি", "Order ID"],
  unit_title: ["কালার ও সাইজ নির্বাচন করুন", "Select color & size"],
  unit_same: ["বাকি সব পিস প্রথমটির মতো", "All other pieces same as the first"],
  unit_item: ["আইটেম {n}", "Item {n}"],
  unit_ok: ["ঠিক আছে", "Done"],
  units_label: ["আইটেম", "Items"],
  net_error: ["নেটওয়ার্ক সমস্যা হয়েছে, আবার চেষ্টা করুন।", "Network problem, please try again."],
  give_title: ["🎁 পরবর্তী অর্ডারে বিশেষ ছাড়", "🎁 Special discount on your next order"],
  give_note: ["এই কোডে {p}% ছাড় পাবেন।", "Get {p}% off with this code."],
  give_exp: ["মেয়াদ: {d} দিন", "Valid for {d} days"]
};

/* ============================================================
   Admin strings  [বাংলা, English]  — অ্যাডমিন ডিফল্টে English
   ============================================================ */

const ADMIN_STRINGS = {
  login_title: ["অ্যাডমিন লগইন", "Admin login"],
  login_sub: ["অ্যাডমিন অ্যাকাউন্টে লগইন করুন", "Sign in to your admin account"],
  username: ["ইউজারনেম", "Username"],
  password: ["পাসওয়ার্ড", "Password"],
  login_btn: ["লগইন করুন", "Sign in"],
  login_fail: ["লগইন হয়নি", "Sign-in failed"],
  net_error: ["নেটওয়ার্ক সমস্যা!", "Network error!"],
  session_expired: ["সেশন শেষ হয়েছে, আবার লগইন করুন।", "Session expired, please sign in again."],
  nav_dash: ["ড্যাশবোর্ড", "Dashboard"],
  nav_orders: ["অর্ডার", "Orders"],
  nav_product: ["প্রোডাক্ট", "Product"],
  nav_offers: ["অফার ও কুপন", "Offers & coupons"],
  nav_inventory: ["ইনভেন্টরি", "Inventory"],
  nav_admins: ["অ্যাডমিন", "Admins"],
  nav_logs: ["লগ", "Logs"],
  nav_settings: ["সেটিংস", "Settings"],
  theme_tip: ["থিম বদলান", "Toggle theme"],
  logout: ["লগআউট", "Log out"],
  refresh: ["রিফ্রেশ", "Refresh"],
  dash_title: ["ড্যাশবোর্ড", "Dashboard"],
  pw_warn: ["আপনি এখনো ডিফল্ট পাসওয়ার্ড ব্যবহার করছেন। নিরাপত্তার জন্য এখনই বদলান।", "You are still using the default password. Change it now for safety."],
  change_pw: ["পাসওয়ার্ড বদলান", "Change password"],
  stat_total: ["মোট অর্ডার", "Total orders"],
  stat_today: ["আজকের অর্ডার", "Today's orders"],
  stat_pending: ["অপেক্ষমাণ", "Pending"],
  stat_revenue: ["ডেলিভারি সম্পন্ন আয়", "Delivered revenue"],
  status_bars: ["অর্ডারের অবস্থা", "Order status"],
  stock_box: ["প্রোডাক্ট ও স্টক", "Product & stock"],
  recent: ["সাম্প্রতিক অর্ডার", "Recent orders"],
  see_all: ["সব দেখুন →", "View all →"],
  daily_title: ["গত ৭ দিনের অর্ডার ও বিক্রি", "Orders & sales, last 7 days"],
  orders_title: ["অর্ডার", "Orders"],
  orders_sub: ["অর্ডার আইডি, নাম বা ফোন দিয়ে খুঁজুন", "Search by order ID, full name or full phone"],
  csv: ["CSV", "CSV"],
  search_ph: ["🔍 NL-XXXXX-XXXXX, পুরো নাম বা পুরো ফোন নাম্বার", "🔍 NL-XXXXX-XXXXX, full name or full phone"],
  all_status: ["সব স্ট্যাটাস", "All statuses"],
  all_time: ["সব সময়", "All time"],
  today: ["আজ", "Today"],
  last7: ["গত ৭ দিন", "Last 7 days"],
  orders_count: ["{n} টি অর্ডার", "{n} orders"],
  more_avail: ["(আরও আছে)", "(more available)"],
  load_more: ["আরও দেখুন", "Load more"],
  no_orders: ["কোনো অর্ডার পাওয়া যায়নি", "No orders found"],
  no_orders_yet: ["এখনো কোনো অর্ডার নেই", "No orders yet"],
  st_Pending: ["অপেক্ষমাণ", "Pending"],
  st_Confirmed: ["নিশ্চিত", "Confirmed"],
  st_Delivered: ["ডেলিভারি সম্পন্ন", "Delivered"],
  st_Cancelled: ["বাতিল", "Cancelled"],
  d_phone: ["ফোন", "Phone"],
  d_address: ["ঠিকানা", "Address"],
  d_area: ["এরিয়া", "Area"],
  d_variant: ["কালার / সাইজ", "Color / size"],
  d_qty: ["পরিমাণ", "Quantity"],
  d_delivery: ["ডেলিভারি", "Delivery"],
  d_total: ["মোট (COD)", "Total (COD)"],
  d_time: ["সময়", "Time"],
  d_status: ["স্ট্যাটাস", "Status"],
  d_bulk: ["বাল্ক ছাড়", "Bulk discount"],
  d_coupon: ["কুপন ছাড়", "Coupon discount"],
  qty_unit: ["টি", "pcs"],
  act_call: ["📞 কল", "📞 Call"],
  act_wa: ["💬 WhatsApp", "💬 WhatsApp"],
  act_inv: ["🧾 ইনভয়েস", "🧾 Invoice"],
  act_copy: ["📋 কপি", "📋 Copy"],
  delete_order: ["অর্ডার ডিলিট করুন", "Delete order"],
  delete_confirm: ["অর্ডার {id} ডিলিট করতে চান? এটি ফেরত নেওয়া যাবে না।", "Delete order {id}? This cannot be undone."],
  deleted: ["ডিলিট হয়েছে", "Deleted"],
  status_updated: ["স্ট্যাটাস আপডেট হয়েছে", "Status updated"],
  status_fail: ["স্ট্যাটাস আপডেট হয়নি", "Status update failed"],
  copied: ["কপি হয়েছে: {id}", "Copied: {id}"],
  copy_fail: ["কপি করা যায়নি", "Copy failed"],
  popup_block: ["Popup block হয়েছে। Popup allow করুন।", "Popup was blocked. Allow popups and try again."],
  note_label: ["অর্ডারের নোট (শুধু admin দেখবে)", "Order note (admin only)"],
  note_save: ["💾 নোট সেভ করুন", "💾 Save note"],
  note_saved: ["নোট সেভ হয়েছে", "Note saved"],
  csv_empty: ["ডাউনলোড করার মতো অর্ডার নেই", "No orders to export"],

  inv_title: ["ইনভয়েস প্রিভিউ", "Invoice preview"],
  inv_print: ["🖨️ প্রিন্ট / PDF", "🖨️ Print / PDF"],
  inv_download: ["⬇️ ফাইল সেভ (HTML)", "⬇️ Save file (HTML)"],
  inv_back: ["← অর্ডারে ফিরুন", "← Back to order"],
  inv_kind: ["ডেলিভারি ইনভয়েস", "Delivery invoice"],
  inv_date: ["তারিখ", "Date"],
  inv_status: ["স্ট্যাটাস", "Status"],
  inv_bill_to: ["গ্রাহকের তথ্য", "Bill to"],
  inv_delivery: ["ডেলিভারি তথ্য", "Delivery details"],
  inv_payment: ["পেমেন্ট", "Payment"],
  inv_contact: ["যোগাযোগ", "Contact"],
  inv_col_no: ["#", "#"],
  inv_col_color: ["কালার", "Color"],
  inv_col_size: ["সাইজ", "Size"],
  inv_col_qty: ["পরিমাণ", "Qty"],
  inv_unit: ["একক দাম", "Unit price"],
  inv_amount: ["মোট দাম", "Amount"],
  inv_subtotal: ["পণ্যের দাম", "Subtotal"],
  inv_delivery_charge: ["ডেলিভারি চার্জ", "Delivery charge"],
  inv_grand: ["সর্বমোট", "Grand total"],
  inv_cod: ["ক্যাশ অন ডেলিভারি (COD)", "Cash on delivery (COD)"],
  inv_thanks: ["ধন্যবাদ আমাদের সাথে থাকার জন্য! ❤️", "Thank you for shopping with us! ❤️"],
  inv_product: ["প্রোডাক্ট", "Product"],
  save_pdf_hint: ["ফোনে প্রিন্ট না হলে ফাইল সেভ করে ব্রাউজারে খুলে শেয়ার/সেভ করুন।", "If printing is unavailable on your phone, save the file and open it in the browser to share or print."],

  prod_title: ["প্রোডাক্ট", "Product"],
  prod_sub: ["প্রোডাক্টের তথ্য, দাম, স্টক ও ছবি", "Product details, pricing, stock and images"],
  basic: ["মৌলিক তথ্য", "Basic info"],
  name_label: ["প্রোডাক্টের নাম", "Product name"],
  desc_label: ["বিবরণ", "Description"],
  trust_title: ["বিশ্বাসযোগ্যতার চিহ্ন (৩টি)", "Trust badges (3 items)"],
  trust_hint: ["ইমোজি, বাংলা ও ইংরেজি লেখা। লেখা খালি রাখলে সেই আইটেম দেখাবে না।", "Emoji, Bengali and English text. Leave the text empty to hide an item."],
  icon_label: ["ইমোজি", "Emoji"],
  prices: ["দাম ও স্টক", "Pricing & stock"],
  offer_price: ["অফার মূল্য (৳)", "Offer price (৳)"],
  old_price: ["আগের মূল্য (৳)", "Old price (৳)"],
  stock_label: ["স্টক সংখ্যা", "Stock quantity"],
  stock_moved: ["স্টক এখন ইনভেন্টরি ট্যাব থেকে সেট করুন", "Set stock from the Inventory tab"],
  variants: ["বৈচিত্র্য ও ডেলিভারি", "Variants & delivery"],
  colors_label: ["কালার (কমা দিয়ে)", "Colors (comma separated)"],
  sizes_label: ["সাইজ (কমা দিয়ে)", "Sizes (comma separated)"],
  in_fee: ["ঢাকার ভেতরে ডেলিভারি (৳)", "Inside Dhaka delivery (৳)"],
  out_fee: ["ঢাকার বাইরে ডেলিভারি (৳)", "Outside Dhaka delivery (৳)"],
  call_no: ["কল নাম্বার", "Call number"],
  wa_no: ["WhatsApp (88 সহ)", "WhatsApp (with 88)"],
  images: ["ছবি", "Images"],
  ratio_label: ["ছবির অনুপাত (ওয়েবসাইটে এই সাইজেই দেখাবে)", "Image ratio (shown on the website in this ratio)"],
  ratio_hint: ["নতুন ছবি আপলোডের সময় এই অনুপাতে কাটা হবে। আগের ছবি আবার আপলোড করলে নতুন অনুপাত কার্যকর হবে।", "New uploads are cropped to this ratio. Re-upload older images to apply a new ratio."],
  ratio_auto: ["আসল অনুপাত (কাটা হবে না)", "Original ratio (no crop)"],
  badge_label: ["ছাড় ব্যাজের অবস্থান", "Discount badge position"],
  pos_tl: ["উপর-বাম", "Top left"],
  pos_tr: ["উপর-ডান", "Top right"],
  pos_bl: ["নিচ-বাম", "Bottom left"],
  pos_br: ["নিচ-ডান", "Bottom right"],
  upload_images: ["ছবি আপলোড (সর্বোচ্চ ৮টি)", "Upload images (max 8)"],
  or_url: ["অথবা https:// ছবির লিংক", "Or an https:// image link"],
  add: ["যোগ করুন", "Add"],
  img_fail: ["ছবি লোড হয়নি: {name}", "Could not load image: {name}"],
  max_images: ["সর্বোচ্চ {n}টি ছবি", "Maximum {n} images"],
  need_image: ["অন্তত একটি ছবি যুক্ত করুন!", "Add at least one image!"],
  visible_label: ["ওয়েবসাইটে এই প্রোডাক্ট দেখাও", "Show this product on the website"],
  visible_hint: ["বন্ধ রাখলে ওয়েবসাইটে 'পাওয়া যাচ্ছে না' দেখাবে, অর্ডার নেওয়া যাবে না।", "When off, the website shows 'currently unavailable' and orders are blocked."],
  faq_section: ["সাধারণ প্রশ্ন ও উত্তর (FAQ)", "FAQ"],
  faq_add: ["➕ প্রশ্ন যোগ করুন", "➕ Add question"],
  faq_del: ["মুছুন", "Remove"],
  faq_max: ["সর্বোচ্চ {n}টি প্রশ্ন", "Maximum {n} questions"],
  faq_q_bn: ["প্রশ্ন (বাংলা)", "Question (Bengali)"],
  faq_q_en: ["প্রশ্ন (English)", "Question (English)"],
  faq_a_bn: ["উত্তর (বাংলা)", "Answer (Bengali)"],
  faq_a_en: ["উত্তর (English)", "Answer (English)"],

  nt_title: ["📢 বিশেষ নোটিস / বিজ্ঞপ্তি (FAQ-এর উপরে দেখাবে)", "📢 Special notices (shown above the FAQ)"],
  nt_hint: ["অফার, ঘোষণা বা যেকোনো বিশেষ তথ্য লিখুন। প্রতিটি নোটিসের লেখা, ফন্ট, সাইজ, রঙ, ছবি ও ব্যাকগ্রাউন্ড আলাদাভাবে বদলানো যাবে।", "Write offers, announcements or any special info. Each notice has its own text, font, size, colors, image and background."],
  nt_add: ["➕ নোটিস যোগ করুন", "➕ Add notice"],
  nt_max: ["সর্বোচ্চ {n}টি নোটিস", "Maximum {n} notices"],
  nt_empty: ["কোনো নোটিস নেই", "No notices"],
  nt_block: ["নোটিস {n}", "Notice {n}"],
  nt_del: ["মুছুন", "Remove"],
  nt_on: ["ওয়েবসাইটে দেখাও", "Show on website"],
  nt_head_bn: ["শিরোনাম (বাংলা)", "Heading (Bengali)"],
  nt_head_en: ["শিরোনাম (English)", "Heading (English)"],
  nt_body_bn: ["লেখা (বাংলা)", "Text (Bengali)"],
  nt_body_en: ["লেখা (English)", "Text (English)"],
  nt_font: ["ফন্ট", "Font"],
  nt_f_sans: ["সাধারণ (Sans)", "Sans"],
  nt_f_serif: ["সেরিফ (Serif)", "Serif"],
  nt_f_mono: ["মনোস্পেস (Mono)", "Mono"],
  nt_f_display: ["জোরালো (Display)", "Display"],
  nt_align: ["লেখার অবস্থান", "Alignment"],
  nt_head_size: ["শিরোনামের সাইজ (px)", "Heading size (px)"],
  nt_body_size: ["লেখার সাইজ (px)", "Text size (px)"],
  nt_head_color: ["শিরোনামের রঙ", "Heading color"],
  nt_body_color: ["লেখার রঙ", "Text color"],
  nt_bg: ["ব্যাকগ্রাউন্ড রঙ", "Background color"],
  nt_bg_none: ["ব্যাকগ্রাউন্ড নেই", "No background"],
  nt_bold: ["শিরোনাম মোটা (Bold)", "Bold heading"],
  nt_img: ["ছবি (ঐচ্ছিক)", "Image (optional)"],
  nt_img_file: ["ছবি আপলোড", "Upload image"],
  nt_img_url: ["অথবা https:// ছবির লিংক", "Or an https:// image link"],
  nt_img_remove: ["ছবি সরান", "Remove image"],
  nt_preview: ["প্রিভিউ", "Preview"],
  nt_too_big: ["ছবি অনেক বড়, ছোট ছবি দিন।", "Image is too large, use a smaller one."],

  bulk_title: ["📦 বাল্ক অফার (একসাথে বেশি নিলে ছাড়)", "📦 Bulk offer (discount for multiple items)"],
  bulk_hint_admin: ["চালু থাকলে এই পরিমাণ বা বেশি অর্ডারে অর্ডারের বিলে ছাড় স্বয়ংক্রিয়ভাবে যোগ হবে।", "When on, the discount is applied automatically to orders at or above this quantity."],
  bulk_enabled: ["বাল্ক অফার চালু", "Bulk offer on"],
  bulk_min: ["ন্যূনতম পরিমাণ", "Minimum quantity"],
  bulk_type: ["ছাড়ের ধরন", "Discount type"],
  bulk_pct: ["শতাংশ (%)", "Percent (%)"],
  bulk_fixed: ["নির্দিষ্ট টাকা (৳)", "Fixed amount (৳)"],
  bulk_value: ["ছাড়ের মান", "Discount value"],
  bulk_save: ["💾 বাল্ক অফার সেভ করুন", "💾 Save bulk offer"],
  bulk_saved: ["বাল্ক অফার সেভ হয়েছে", "Bulk offer saved"],
  off_title: ["অফার ও কুপন", "Offers & coupons"],
  off_sub: ["বাল্ক ছাড় ও কুপন কোড এখান থেকে নিয়ন্ত্রণ করুন", "Manage bulk discounts and coupon codes here"],
  cp_title: ["🎟️ কুপন তৈরি", "🎟️ Create coupon"],
  cp_hint: ["কুপন কোড দিলে অর্ডারের বিলে শতাংশ হারে ছাড় পড়বে। 'পুরস্কার কুপন' বাছাই করলে অর্ডার সফলের পর ধন্যবাদ পাতায় গ্রাহককে একটি নিজস্ব কোড দেখানো হবে।", "A coupon gives a percent discount on the bill. Choose a reward rule to show the customer a personal code on the thank-you page after an order."],
  cp_code: ["কুপন কোড", "Coupon code"],
  cp_gen: ["🎲 তৈরি", "🎲 Generate"],
  cp_percent: ["ছাড় (%)", "Discount (%)"],
  cp_max: ["সর্বোচ্চ কতবার (0 = সীমাহীন)", "Max uses (0 = unlimited)"],
  cp_expiry: ["মেয়াদ (দিন, খালি = মেয়াদহীন)", "Expiry (days, empty = none)"],
  cp_reward: ["পুরস্কার হিসেবে দেবে", "Give as reward"],
  cp_r_none: ["না (শুধু কোড হিসেবে)", "No (code only)"],
  cp_r_every: ["প্রতি অর্ডারে", "Every order"],
  cp_r_first: ["শুধু প্রথম অর্ডারে", "First order only"],
  cp_active: ["সক্রিয়", "Active"],
  cp_create: ["➕ কুপন তৈরি করুন", "➕ Create coupon"],
  cp_created: ["কুপন তৈরি হয়েছে", "Coupon created"],
  cp_list: ["কুপন তালিকা", "Coupon list"],
  cp_personal: ["গ্রাহকদের পুরস্কার কুপন", "Customer reward coupons"],
  cp_personal_hint: ["প্রতিটি অর্ডারের পর তৈরি হওয়া নিজস্ব কোড। প্রতিটি একবার ব্যবহারযোগ্য।", "Personal codes created after orders. Each can be used once."],
  cp_unlimited: ["সীমাহীন", "Unlimited"],
  cp_never: ["মেয়াদহীন", "No expiry"],
  cp_none: ["কোনো কুপন নেই", "No coupons yet"],
  cp_on: ["চালু", "On"],
  cp_off: ["বন্ধ", "Off"],
  cp_used: ["ব্যবহৃত", "Used"],
  cp_unused: ["অব্যবহৃত", "Unused"],
  cp_words: ["শব্দ (কমা দিয়ে, ইংরেজি অক্ষরে)", "Words (comma separated, English letters)"],
  cp_words_ph: ["যেমন: EID, SALE", "e.g. EID, SALE"],
  cp_suffix: ["এলোমেলো অংশের দৈর্ঘ্য", "Random part length"],
  cp_engine: ["কোড তৈরির ধরন", "Code style"],
  cp_eng_alnum: ["A-Z ও ০-৯ (সব)", "A-Z and 0-9 (all)"],
  cp_eng_readable: ["সহজে পড়া যায় এমন (০, ১, I, O বাদ)", "Easy to read (no 0, 1, I, O)"],
  cp_eng_letters: ["শুধু ইংরেজি অক্ষর", "Letters only"],
  cp_eng_digits: ["শুধু সংখ্যা", "Digits only"],
  cp_gen_custom: ["🎲 শব্দ ও ধরন অনুযায়ী তৈরি", "🎲 Generate from words & style"],
  cp_left_days: ["{d} দিন {h} ঘণ্টা বাকি", "{d}d {h}h left"],
  cp_left_hours: ["{h} ঘণ্টা {m} মিনিট বাকি", "{h}h {m}m left"],
  cp_left_min: ["{m} মিনিট বাকি", "{m} min left"],
  cp_expired: ["মেয়াদ শেষ", "Expired"],
  cp_history: ["📥 ইতিহাস (CSV)", "📥 History (CSV)"],
  cp_delete_step1: ["এই কুপনটি মুছতে চান? এটি ফেরত নেওয়া যাবে না:", "Delete this coupon? This cannot be undone:"],
  cp_delete_type: ["নিশ্চিত করতে কুপন কোডটি টাইপ করুন: {code}", "Type the coupon code to confirm: {code}"],
  cp_delete_mismatch: ["কোড মেলেনি, কুপন মোছা হয়নি", "Code does not match, coupon not deleted"],
  cp_templates: ["এখন সক্রিয় পুরস্কার নিয়ম: {n}টি। অর্ডার সফল হলে গ্রাহক নিজস্ব কোড পাবেন।", "Active reward rules: {n}. Customers get a personal code after a successful order."],
  cp_no_templates: ["এখন কোনো পুরস্কার নিয়ম সক্রিয় নেই। উপরে 'পুরস্কার হিসেবে দেবে' থেকে 'প্রতি অর্ডারে' বা 'শুধু প্রথম অর্ডারে' বেছে কুপন তৈরি করুন।", "No reward rule is active. Create a coupon above and choose 'Every order' or 'First order only' under 'Give as reward'."],
  notes_title: ["📝 ওয়েবসাইটের নোট", "📝 Website notes"],
  notes_bulk: ["বাল্ক অফার নোট (Quantity-র নিচে দেখাবে)", "Bulk offer note (shown below Quantity)"],
  notes_coupon: ["কুপন নোট (কুপন কোড-এর নিচে দেখাবে)", "Coupon note (shown below the coupon code)"],
  notes_bn: ["বাংলা", "Bengali"],
  notes_en: ["English", "English"],
  notes_save: ["💾 নোট সেভ করুন", "💾 Save notes"],
  notes_saved: ["নোট সেভ হয়েছে", "Notes saved"],
  notes_show: ["ওয়েবসাইটে দেখাও", "Show on website"],

  tb_title: ["🔔 ওয়েবসাইটের উপরের বারের লেখা", "🔔 Website top bar text"],
  tb_hint: ["লেখা, ফন্ট সাইজ, ডানে-বামে সরানো ও বারের উচ্চতা এখান থেকে বদলান। নতুন লাইনের জন্য Enter চাপুন।", "Change the text, font size, left/right position and bar height here. Press Enter for a new line."],
  tb_bn: ["লেখা (বাংলা)", "Text (Bengali)"],
  tb_en: ["লেখা (English)", "Text (English)"],
  tb_size: ["ফন্ট সাইজ (px)", "Font size (px)"],
  tb_align: ["লেখার অবস্থান", "Text alignment"],
  tb_left: ["বামে", "Left"],
  tb_center: ["মাঝে", "Center"],
  tb_right: ["ডানে", "Right"],
  tb_offset: ["ডানে/বামে সরান (px, − = বামে)", "Shift left/right (px, − = left)"],
  tb_pad: ["বারের উচ্চতা (উপর-নিচ ফাঁকা, px)", "Bar height (top/bottom padding, px)"],
  tb_reset: ["↺ ডিফল্টে ফিরুন", "↺ Reset to default"],
  tb_lang_show: ["ভাষা (EN/বাং) বাটন দেখাও", "Show language (EN/বাং) button"],
  tb_lang_size: ["ভাষা বাটনের ফন্ট সাইজ (px)", "Language button font size (px)"],
  tb_preview: ["প্রিভিউ", "Preview"],

  inv_title_h: ["ইনভেন্টরি (স্টক)", "Inventory (stock)"],
  inv_sub: ["কোন কালার ও সাইজের কতটি স্টক আছে", "Stock count for each color and size"],
  inv_color: ["কালার / সাইজ", "Color / size"],
  inv_total: ["মোট", "Total"],
  inv_single: ["মোট স্টক", "Total stock"],
  inv_save: ["💾 স্টক সেভ করুন", "💾 Save stock"],
  inv_saved: ["স্টক সেভ হয়েছে", "Stock saved"],
  inv_note: ["কম স্টক হলে হলুদ, শেষ হলে লাল। স্টক শেষ কালার/সাইজ ওয়েবসাইটে বন্ধ থাকবে।", "Low stock shows yellow, empty shows red. Out-of-stock colors/sizes are disabled on the website."],
  inv_add_title: ["➕ নতুন প্রোডাক্ট (কালার / সাইজ) যোগ করুন", "➕ Add new product (color / size)"],
  inv_add_hint: ["নতুন কালার বা সাইজ লিখলে সেটি প্রোডাক্টের তালিকায় যোগ হবে এবং ওয়েবসাইটে দেখাবে। আগে থেকে থাকা কালার/সাইজ লিখলে শুধু স্টক সেট হবে।", "A new color or size is added to the product and shown on the website. If it already exists, only its stock is set."],
  inv_add_color: ["কালার", "Color"],
  inv_add_size: ["সাইজ", "Size"],
  inv_add_qty: ["স্টক সংখ্যা", "Stock quantity"],
  inv_add_btn: ["➕ যোগ করুন", "➕ Add"],
  inv_added: ["প্রোডাক্ট যোগ হয়েছে", "Product added"],
  inv_add_need: ["কালার বা সাইজ অন্তত একটি লিখুন!", "Enter at least a color or a size!"],

  admins_title: ["অ্যাডমিন ব্যবস্থাপনা", "Admin management"],
  admins_sub: ["সব অ্যাডমিনের সমান অধিকার থাকবে", "All admins have equal access"],
  add_admin: ["নতুন অ্যাডমিন যোগ করুন", "Add a new admin"],
  pw_min8: ["পাসওয়ার্ড (৮+ অক্ষর)", "Password (8+ characters)"],
  add_admin_btn: ["➕ অ্যাডমিন যোগ করুন", "➕ Add admin"],
  admin_list: ["অ্যাডমিন তালিকা", "Admin list"],
  you: ["আপনি", "You"],
  joined: ["যোগ হয়েছে: ", "Joined: "],
  reset_pw: ["পাসওয়ার্ড রিসেট", "Reset password"],
  delete: ["ডিলিট", "Delete"],
  new_pw_prompt: ["নতুন পাসওয়ার্ড দিন (কমপক্ষে ৮ অক্ষর):", "Enter a new password (at least 8 characters):"],
  admin_added: ["নতুন অ্যাডমিন যোগ হয়েছে!", "New admin added!"],
  admin_add_fail: ["অ্যাডমিন যোগ হয়নি!", "Could not add admin!"],
  admin_deleted: ["অ্যাডমিন ডিলিট হয়েছে", "Admin deleted"],
  delete_admin_confirm: ["এই অ্যাডমিনকে ডিলিট করতে চান?", "Delete this admin?"],
  pw_reset_ok: ["পাসওয়ার্ড রিসেট হয়েছে", "Password reset"],
  failed: ["ব্যর্থ হয়েছে", "Failed"],
  no_admins: ["কোনো অ্যাডমিন নেই", "No admins"],

  logs_title: ["অ্যাক্টিভিটি লগ", "Activity log"],
  logs_sub: ["সাম্প্রতিক ২০০টি কার্যক্রম", "Latest 200 actions"],
  col_time: ["সময়", "Time"],
  col_user: ["ব্যবহারকারী", "User"],
  col_action: ["কার্যক্রম", "Action"],
  col_detail: ["বিবরণ", "Details"],
  col_ip: ["IP ঠিকানা", "IP address"],
  no_logs: ["এখনো কোনো লগ নেই", "No logs yet"],

  settings_title: ["সেটিংস", "Settings"],
  settings_sub: ["নিরাপত্তা ও অ্যাকাউন্ট", "Security & account"],
  pw_section: ["🔑 পাসওয়ার্ড পরিবর্তন", "🔑 Change password"],
  cur_pw: ["বর্তমান পাসওয়ার্ড", "Current password"],
  new_pw: ["নতুন পাসওয়ার্ড (৮+ অক্ষর)", "New password (8+ characters)"],
  repeat_pw: ["আবার লিখুন", "Repeat new password"],
  pw_mismatch: ["নতুন পাসওয়ার্ড দুটি মিলছে না!", "New passwords do not match!"],
  pw_changed: ["পাসওয়ার্ড বদলানো হয়েছে, আবার লগইন করুন।", "Password changed, please sign in again."],
  pw_fail: ["পাসওয়ার্ড বদলানো যায়নি!", "Could not change password!"],
  security: ["🛡️ নিরাপত্তা", "🛡️ Security"],
  logout_this: ["এই device থেকে logout", "Log out this device"],
  logout_this_d: ["শুধু এই ব্রাউজার/অ্যাপ থেকে বের হবে", "Signs out only this browser/app"],
  logout_all: ["সব device থেকে logout", "Log out all devices"],
  logout_all_d: ["আপনার অ্যাকাউন্টের সব সক্রিয় সেশন বন্ধ হবে", "Ends every active session on your account"],
  logout_all_btn: ["সব device থেকে logout", "Log out all"],
  logout_all_confirm: ["সব device থেকে logout হবে। নিশ্চিত?", "Log out of all devices? Are you sure?"],
  logged_out_all: ["সব device থেকে logout হয়েছে।", "Logged out of all devices."],
  refreshing: ["রিফ্রেশ হচ্ছে...", "Refreshing..."],
  refreshed: ["রিফ্রেশ হয়েছে", "Refreshed"],
  stock_low: ["কম স্টক", "Low stock"],
  stock_ok: ["পর্যাপ্ত", "In stock"],
  cancel: ["বাতিল", "Cancel"],
  ok: ["ঠিক আছে", "OK"],
  saving: ["সেভ হচ্ছে...", "Saving..."],
  saved_ok: ["✅ প্রোডাক্ট সফলভাবে আপডেট হয়েছে!", "✅ Product updated successfully!"],
  saved_toast: ["প্রোডাক্ট আপডেট হয়েছে", "Product updated"],
  save_all: ["💾 সব সেভ করুন", "💾 Save all"],
  refresh_btn: ["রিফ্রেশ", "Refresh"],
  un_title: ["ইউজারনেম বদলান", "Change username"],
  un_new: ["নতুন ইউজারনেম", "New username"],
  un_save: ["💾 ইউজারনেম বদলান", "💾 Change username"],
  un_done: ["ইউজারনেম বদলানো হয়েছে", "Username changed"],
  cred_title: ["নতুন অ্যাডমিনের তথ্য", "New admin credentials"],
  cred_note: ["এই পাসওয়ার্ড পরে আর দেখানো যাবে না। এখনই কপি করে নিরাপদ জায়গায় রাখুন।", "This password cannot be shown again later. Copy it now and store it safely."],
  pr_title: ["🖨️ প্রিন্টার সেটিংস", "🖨️ Printer settings"],
  pr_sub: ["ইনভয়েস ও POS রসিদের ডিজাইন, থিম ও প্রিন্ট সেটিং", "Invoice and POS receipt design, themes and print setup"],
  pr_invoice: ["ইনভয়েস", "Invoice"],
  pr_pos: ["POS রসিদ", "POS receipt"],
  pr_brand: ["ব্র্যান্ড নাম", "Brand name"],
  pr_tag: ["ট্যাগলাইন", "Tagline"],
  pr_contact: ["যোগাযোগ নাম্বার", "Contact number"],
  pr_logo: ["লোগো (ছবি)", "Logo image"],
  pr_logo_w: ["লোগোর প্রস্থ (px)", "Logo width (px)"],
  pr_logo_rm: ["লোগো সরান", "Remove logo"],
  pr_logo_big: ["লোগো ছবি অনেক বড়, ছোট ছবি দিন।", "Logo image is too large, use a smaller one."],
  pr_primary: ["প্রধান রঙ", "Primary color"],
  pr_text: ["লেখার রঙ", "Text color"],
  pr_bg: ["পটভূমির রঙ", "Background color"],
  pr_line: ["লাইনের রঙ", "Line color"],
  pr_header: ["উপরের রঙিন ব্যান্ড", "Colored header band"],
  pr_lines: ["ডিভাইডার লাইন দেখাও", "Show divider lines"],
  pr_base: ["মূল ফন্ট সাইজ (px)", "Base font size (px)"],
  pr_margin: ["মার্জিন (mm)", "Margin (mm)"],
  pr_page: ["পেজ সাইজ", "Page size"],
  pr_show: ["কী কী দেখাবে", "What to show"],
  pr_footer_bn: ["ফুটার (বাংলা)", "Footer (Bengali)"],
  pr_footer_en: ["ফুটার (English)", "Footer (English)"],
  pr_save: ["💾 ডিজাইন সেভ করুন", "💾 Save design"],
  pr_reset: ["↺ সেভ করা ডিজাইনে ফিরুন", "↺ Revert to saved"],
  pr_preview: ["লাইভ প্রিভিউ", "Live preview"],
  pr_saved: ["প্রিন্ট ডিজাইন সেভ হয়েছে", "Print design saved"],
  pr_print: ["🖨️ প্রিন্ট", "🖨️ Print"],
  pr_design: ["🎨 ডিজাইন", "🎨 Design"],
  act_pos: ["🧾 POS", "🧾 POS"],
  off_stat_active: ["সক্রিয় কুপন", "Active coupons"],
  off_stat_uses: ["কুপন ব্যবহার", "Coupon uses"],
  off_stat_cdisc: ["কুপনে মোট ছাড়", "Coupon discount given"],
  off_stat_bdisc: ["বাল্কে মোট ছাড়", "Bulk discount given"],
  cp_search: ["কুপন কোড খুঁজুন", "Search coupon code"],
  rw_search: ["রিওয়ার্ড কোড খুঁজুন", "Search reward code"],
  cp_f_all: ["সব", "All"],
  cp_f_active: ["সক্রিয়", "Active"],
  cp_f_inactive: ["বন্ধ", "Inactive"],
  cp_f_expired: ["মেয়াদ শেষ", "Expired"],
  cp_f_used: ["শেষ", "Used up"],
  cp_share: ["📣 শেয়ার", "📣 Share"],
  cp_share_txt: ["🎉 কুপন কোড: {code} — {p}% ছাড়!", "🎉 Coupon code: {code} — {p}% off!"],
  cp_share_done: ["শেয়ার টেক্সট কপি হয়েছে", "Share text copied"],
  cp_preset: ["দ্রুত শতাংশ", "Quick %"],
  rh_title: ["🎁 রিওয়ার্ড কুপনের ইতিহাস", "🎁 Reward coupon history"],
  rh_sub: ["কোন অর্ডার থেকে কোড এসেছে, কোন অর্ডারে ব্যবহার হয়েছে — সব এখানে", "Which order issued each code and which order used it"],
  rh_from: ["কোন অর্ডার থেকে", "Issued from"],
  rh_used_in: ["কোন অর্ডারে ব্যবহৃত", "Used in order"],
  rh_used_at: ["ব্যবহারের সময়", "Used at"],
  rh_status: ["অবস্থা", "Status"],
  rh_none: ["এখনো কোনো রিওয়ার্ড কুপন নেই", "No reward coupons yet"],
  rh_export: ["📥 CSV", "📥 CSV"],
  sec_head: ["🛡️ নিরাপত্তা ও অ্যাকাউন্ট", "🛡️ Security & account"],
  sec_sessions: ["আমার সক্রিয় সেশন", "My active sessions"],
  sec_fails: ["ব্যর্থ লগইন (২৪ ঘণ্টা)", "Failed logins (24h)"],
  sec_admins: ["মোট অ্যাডমিন", "Total admins"],
  sec_last: ["আগের লগইন", "Previous sign-in"],
  sec_user: ["লগইন আছেন: {u}", "Signed in as: {u}"],
  log_all: ["সব", "All"],
  log_sec: ["🛡️ Security", "🛡️ Security"],
  log_ord: ["অর্ডার", "Orders"],
  log_cat: ["প্রোডাক্ট ও অফার", "Products & offers"],
  log_fails: ["মোট ব্যর্থ লগইন চেষ্টা: {n}", "Failed sign-in attempts: {n}"],
  pr_adv: ["⚙️ অ্যাডভান্স সেটিং", "⚙️ Advanced settings"],
  pr_line_h: ["লাইনের উচ্চতা (%)", "Line height (%)"],
  pr_table: ["টেবিল স্টাইল", "Table style"],
  pr_tb_grid: ["গ্রিড (সব লাইন)", "Grid (all lines)"],
  pr_tb_plain: ["সাধারণ (শুধু নিচের লাইন)", "Plain (bottom lines only)"],
  pr_tb_zebra: ["জেব্রা (একান্তর রঙ)", "Zebra stripes"],
  pr_fw: ["লেখার মোটা ভাব", "Text weight"],
  pr_fw_n: ["সাধারণ", "Normal"],
  pr_fw_b: ["মাঝারি", "Medium"],
  pr_fw_x: ["গাঢ়", "Bold"],
  pr_halign: ["লেখার সারিবদ্ধতা", "Text alignment"],
  pr_radius: ["বক্সের কোণ (px)", "Box corner radius (px)"],
  pr_wm: ["ওয়াটারমার্ক লেখা", "Watermark text"],
  pr_upper: ["টেবিল হেডার বড় হাতের অক্ষরে", "Uppercase table headers"],
  pr_compact: ["ঘন (কম ফাঁকা) লেআউট", "Compact layout"],
  pr_items: ["আইটেম দেখানোর ধরন", "Item layout"],
  pr_it_table: ["টেবিল (কলামে)", "Table (columns)"],
  pr_it_stack: ["নাম আলাদা লাইনে (লম্বা নামের জন্য)", "Stacked (name on its own line)"],
  gv_title: ["🎁 Give way — পরবর্তী অর্ডারের কুপন", "🎁 Give way — next-order coupon"],
  gv_sub: ["অর্ডার কনফার্মের পর ধন্যবাদ পাতায় এই মেসেজ ও কোড দেখাবে, গ্রাহক কপি করে নিতে পারবে", "Shown on the thank-you page after an order; customers can copy the code"],
  gv_on: ["ধন্যবাদ পাতায় দেখাও", "Show on thank-you page"],
  gv_code: ["কুপন কোড", "Coupon code"],
  gv_gen: ["🎲 কোড তৈরি ও সেভ", "🎲 Generate & save"],
  gv_pct: ["ছাড় (%)", "Discount (%)"],
  gv_exp: ["মেয়াদ (দিন, খালি = মেয়াদহীন)", "Valid (days, empty = none)"],
  gv_bn: ["মেসেজ (বাংলা)", "Message (Bengali)"],
  gv_en: ["মেসেজ (English)", "Message (English)"],
  gv_save: ["💾 Give way সেভ করুন", "💾 Save give way"],
  gv_saved: ["Give way সেভ হয়েছে", "Give way saved"],
  gv_state_on: ["🟢 চালু (বন্ধ করতে ক্লিক)", "🟢 On (click to turn off)"],
  gv_state_off: ["⚪ বন্ধ (চালু করতে ক্লিক)", "⚪ Off (click to turn on)"],
  gv_toggled: ["Give way চালু/বন্ধ হয়েছে", "Give way turned on/off"],
  sa_title: ["🛡️ Security & account", "🛡️ Security & account"],
  gv_generated: ["কোড তৈরি হয়েছে", "Code generated"]
};

/** Dictionary JSON বানানো (script-এ নিরাপদে বসানোর জন্য '<' escape) */
function buildDictJson(map) {
  const bn = {};
  const en = {};
  for (const k of Object.keys(map)) { bn[k] = map[k][0]; en[k] = map[k][1]; }
  return JSON.stringify({ bn, en }).replace(/</g, "\\u003c");
}

/* ============================================================
   Errors & responses
   ============================================================ */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(data, status = 200) {
  return Response.json(data, { status });
}

function fail(status, error) {
  return json({ error }, status);
}

function secure(res, nonce) {
  const headers = new Headers(res.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Cache-Control", "no-store");

  const type = headers.get("Content-Type") || "";
  if (type.includes("text/html")) {
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; " +
      `script-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; ` +
      "base-uri 'none'; form-action 'self'; object-src 'none'"
    );
  } else {
    headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  }
  return new Response(res.body, { status: res.status, headers });
}

/* ============================================================
   Generic helpers
   ============================================================ */

function escHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// দুই ভাষার লেখা: bn খালি থাকলে en, en খালি থাকলে bn দেখাবে
function biHtml(bn, en) {
  return '<span class="l-bn">' + escHtml(bn || en) + '</span><span class="l-en">' + escHtml(en || bn) + '</span>';
}

function toInt(value, fallback) {
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(value, min, max, fallback) {
  const n = toInt(value, fallback);
  return Math.max(min, Math.min(max, n));
}

function splitList(str) {
  return String(str || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function randomHex(bytes) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(digest));
}

async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexToBytes(saltHex), iterations: PBKDF2_ITER, hash: "SHA-256" },
    key, 256
  );
  return bytesToHex(new Uint8Array(bits));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readJson(request, limit = MAX_BODY_BYTES) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.includes("application/json")) throw new HttpError(415, "Unsupported content type");
  const text = await request.text().catch(() => "");
  if (text.length > limit) throw new HttpError(413, "অনুরোধ অনেক বড়। ছবির সাইজ কমান।");
  try {
    return JSON.parse(text || "{}");
  } catch (e) {
    throw new HttpError(400, "Invalid request");
  }
}

function getIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

async function getRateLimitHits(db, key, windowMs) {
  const row = await db.prepare("SELECT hits, window_start FROM rate_limits WHERE rate_key = ?").bind(key).first();
  if (!row || Date.now() - Number(row.window_start) >= windowMs) return 0;
  return Number(row.hits) || 0;
}

async function incrementRateLimit(db, key, windowMs) {
  const now = Date.now();
  await db.batch([
    db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(now - 48 * 60 * 60 * 1000),
    db.prepare(`INSERT INTO rate_limits (rate_key, hits, window_start) VALUES (?, 1, ?)
      ON CONFLICT(rate_key) DO UPDATE SET
        hits = CASE WHEN rate_limits.window_start + ? <= ? THEN 1 ELSE rate_limits.hits + 1 END,
        window_start = CASE WHEN rate_limits.window_start + ? <= ? THEN ? ELSE rate_limits.window_start END`)
      .bind(key, now, windowMs, now, windowMs, now, now)
  ]);
  return getRateLimitHits(db, key, windowMs);
}

async function clearRateLimits(db, keys) {
  if (keys.length) await db.batch(keys.map((key) => db.prepare("DELETE FROM rate_limits WHERE rate_key = ?").bind(key)));
}

function cleanImages(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((s) => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowedImage(s) {
  return /^https:\/\/[^\s"'<>]+$/i.test(s) ||
    /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s);
}

function parseArrayOr(raw, fallback) {
  if (raw === null || raw === undefined) return fallback;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

function cleanTrust(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, MAX_TRUST).map((x) => ({
    icon: String(x?.icon ?? "").trim().slice(0, 8),
    bn: String(x?.bn ?? "").trim().slice(0, 120),
    en: String(x?.en ?? "").trim().slice(0, 120)
  })).filter((x) => x.bn || x.en);
}

function cleanFaqs(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, MAX_FAQ).map((x) => ({
    qbn: String(x?.qbn ?? "").trim().slice(0, 300),
    qen: String(x?.qen ?? "").trim().slice(0, 300),
    abn: String(x?.abn ?? "").trim().slice(0, 1000),
    aen: String(x?.aen ?? "").trim().slice(0, 1000)
  })).filter((x) => (x.qbn || x.qen) && (x.abn || x.aen));
}

// নোটিস: শিরোনাম, লেখা, ফন্ট, সাইজ, রঙ, ব্যাকগ্রাউন্ড, ছবি — সব যাচাই করে
function cleanNotices(list) {
  if (!Array.isArray(list)) return [];
  const str = (v, max) => String(v ?? "").trim().slice(0, max);
  return list.slice(0, MAX_NOTICES).map((x) => {
    const image = str(x?.image, 400 * 1024);
    return {
      on: x?.on !== false,
      head_bn: str(x?.head_bn, 160),
      head_en: str(x?.head_en, 160),
      body_bn: str(x?.body_bn, 1000),
      body_en: str(x?.body_en, 1000),
      image: isAllowedImage(image) ? image : "",
      font: Object.prototype.hasOwnProperty.call(NOTICE_FONT_CSS, x?.font) ? x.font : "sans",
      align: NOTICE_ALIGN.includes(x?.align) ? x.align : "left",
      head_size: clampInt(x?.head_size, 12, 40, 20),
      body_size: clampInt(x?.body_size, 10, 24, 15),
      head_color: HEX_RE.test(String(x?.head_color ?? "")) ? x.head_color : "#0f172a",
      body_color: HEX_RE.test(String(x?.body_color ?? "")) ? x.body_color : "#475569",
      bg: HEX_RE.test(String(x?.bg ?? "")) ? x.bg : "",
      bold: x?.bold !== false
    };
  }).filter((n) => n.head_bn || n.head_en || n.body_bn || n.body_en || n.image);
}

/* ============================================================
   Order public ID & search helpers
   ============================================================ */

function newPublicId() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let s = "";
  for (const b of bytes) s += ID_ALPHABET[b % ID_ALPHABET.length];
  return `NL-${s.slice(0, 5)}-${s.slice(5)}`;
}

function normalizeSearch(v) {
  return String(v || "").trim().replace(/^#/, "").toUpperCase().slice(0, 100);
}

function digitsOnly(p) {
  return String(p || "").replace(/\D/g, "");
}

function variantOf(v) {
  return !v || v === "N/A" ? "" : String(v);
}

function parseLines(raw) {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => ({ color: String(x.color || ""), size: String(x.size || ""), qty: Number(x.qty) || 0 }));
  } catch (e) {
    return [];
  }
}

/* ============================================================
   Data encryption (AES-GCM) + blind index (HMAC)
   নাম, ফোন, ঠিকানা, নোট, IP — encrypted; খোঁজার জন্য HMAC index।
   ============================================================ */

function b64Encode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64Decode(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function derivedKeyBytes(env, purpose) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(purpose + "|" + env.DATA_KEY));
  return new Uint8Array(d);
}

async function aesKey(env) {
  return crypto.subtle.importKey("raw", await derivedKeyBytes(env, "enc-v1"), "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function macKey(env) {
  return crypto.subtle.importKey("raw", await derivedKeyBytes(env, "idx-v1"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function encryptField(env, text) {
  const v = String(text ?? "");
  if (!v) return "";
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(env), new TextEncoder().encode(v)));
  return "v1:" + b64Encode(iv) + ":" + b64Encode(ct);
}

async function decryptField(env, value) {
  const v = String(value ?? "");
  if (!v.startsWith("v1:")) return v;
  try {
    const [, ivB, ctB] = v.split(":");
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64Decode(ivB) }, await aesKey(env), b64Decode(ctB));
    return new TextDecoder().decode(pt);
  } catch (e) {
    return "[পড়া যাচ্ছে না]";
  }
}

async function blindIndex(env, domain, text) {
  const data = new TextEncoder().encode(domain + ":" + String(text ?? "").trim().toLowerCase());
  const sig = await crypto.subtle.sign("HMAC", await macKey(env), data);
  return bytesToHex(new Uint8Array(sig));
}

// IP-এর index (rate-limit-এর জন্য); আসল IP encrypted অবস্থায় log-এ থাকে
async function hashIp(env, ip) {
  return (await blindIndex(env, "ip", ip || "unknown")).slice(0, 32);
}

async function encryptLegacyOrders(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, customer_name, phone, address, note FROM orders WHERE enc_v IS NULL"
  ).all();
  for (const r of results || []) {
    const phone = digitsOnly(r.phone);
    await env.DB.prepare(
      "UPDATE orders SET customer_name = ?, phone = ?, address = ?, note = ?, phone_hash = ?, name_hash = ?, enc_v = '1' WHERE id = ?"
    ).bind(
      await encryptField(env, r.customer_name),
      await encryptField(env, r.phone),
      await encryptField(env, r.address),
      await encryptField(env, r.note),
      await blindIndex(env, "phone", phone),
      await blindIndex(env, "name", r.customer_name || ""),
      r.id
    ).run();
  }
}

/* ============================================================
   Schema & migrations
   ============================================================ */

async function ensureSchema(env) {
  if (schemaReady) return;
  const db = env.DB;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS product (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      title TEXT,
      description TEXT,
      price INTEGER,
      old_price INTEGER,
      stock INTEGER,
      image TEXT,
      images TEXT DEFAULT '[]',
      colors TEXT DEFAULT '',
      sizes TEXT DEFAULT '',
      delivery_inside INTEGER DEFAULT 60,
      delivery_outside INTEGER DEFAULT 120,
      contact_phone TEXT DEFAULT '01700000000',
      whatsapp_number TEXT DEFAULT '8801700000000',
      admin_pass TEXT DEFAULT ''
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id TEXT,
      customer_name TEXT,
      phone TEXT,
      address TEXT,
      selected_color TEXT DEFAULT '',
      selected_size TEXT DEFAULT '',
      delivery_area TEXT,
      delivery_charge INTEGER,
      quantity INTEGER,
      total INTEGER,
      status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rate_limits (
      rate_key TEXT PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 0,
      window_start INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (
      k TEXT PRIMARY KEY,
      v TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS devices (
      token TEXT PRIMARY KEY,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT,
      action TEXT NOT NULL,
      target TEXT,
      ip TEXT,
      ip_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS inventory (
      color TEXT NOT NULL DEFAULT '',
      size TEXT NOT NULL DEFAULT '',
      qty INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (color, size)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      percent INTEGER NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 0,
      uses INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      reward_rule TEXT NOT NULL DEFAULT 'none',
      valid_days INTEGER NOT NULL DEFAULT 30,
      is_personal INTEGER NOT NULL DEFAULT 0,
      owner_hash TEXT,
      template_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)
  ]);

  // পুরোনো database-এ missing column যোগ (থাকলে error ignore)
  const alterQueries = [
    "ALTER TABLE product ADD COLUMN image TEXT",
    "ALTER TABLE product ADD COLUMN images TEXT DEFAULT '[]'",
    "ALTER TABLE product ADD COLUMN colors TEXT DEFAULT ''",
    "ALTER TABLE product ADD COLUMN sizes TEXT DEFAULT ''",
    "ALTER TABLE product ADD COLUMN delivery_inside INTEGER DEFAULT 60",
    "ALTER TABLE product ADD COLUMN delivery_outside INTEGER DEFAULT 120",
    "ALTER TABLE product ADD COLUMN contact_phone TEXT DEFAULT '01700000000'",
    "ALTER TABLE product ADD COLUMN whatsapp_number TEXT DEFAULT '8801700000000'",
    "ALTER TABLE product ADD COLUMN admin_pass TEXT DEFAULT ''",
    "ALTER TABLE product ADD COLUMN image_ratio TEXT DEFAULT 'auto'",
    "ALTER TABLE product ADD COLUMN badge_pos TEXT DEFAULT 'tl'",
    "ALTER TABLE product ADD COLUMN trust_items TEXT",
    "ALTER TABLE product ADD COLUMN faqs TEXT",
    "ALTER TABLE product ADD COLUMN notices TEXT DEFAULT '[]'",
    "ALTER TABLE product ADD COLUMN topbar_bn TEXT",
    "ALTER TABLE product ADD COLUMN topbar_en TEXT",
    "ALTER TABLE product ADD COLUMN topbar_size INTEGER",
    "ALTER TABLE product ADD COLUMN topbar_align TEXT",
    "ALTER TABLE product ADD COLUMN topbar_offset INTEGER",
    "ALTER TABLE product ADD COLUMN topbar_pad INTEGER",
    "ALTER TABLE product ADD COLUMN topbar_lang_show INTEGER DEFAULT 1",
    "ALTER TABLE product ADD COLUMN topbar_lang_size INTEGER DEFAULT 12",
    "ALTER TABLE product ADD COLUMN is_active INTEGER DEFAULT 1",
    "ALTER TABLE product ADD COLUMN bulk_enabled INTEGER DEFAULT 0",
    "ALTER TABLE product ADD COLUMN bulk_min_qty INTEGER DEFAULT 2",
    "ALTER TABLE product ADD COLUMN bulk_type TEXT DEFAULT 'percent'",
    "ALTER TABLE product ADD COLUMN bulk_value INTEGER DEFAULT 5",
    "ALTER TABLE orders ADD COLUMN note TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN public_id TEXT",
    "ALTER TABLE orders ADD COLUMN delivery_area TEXT DEFAULT 'ঢাকার ভেতরে'",
    "ALTER TABLE orders ADD COLUMN delivery_charge INTEGER DEFAULT 60",
    "ALTER TABLE orders ADD COLUMN selected_color TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN selected_size TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'Pending'",
    "ALTER TABLE orders ADD COLUMN phone_hash TEXT",
    "ALTER TABLE orders ADD COLUMN name_hash TEXT",
    "ALTER TABLE orders ADD COLUMN enc_v TEXT",
    "ALTER TABLE orders ADD COLUMN subtotal INTEGER DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN bulk_discount INTEGER DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN coupon_discount INTEGER DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN coupon_code TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN lines_json TEXT DEFAULT ''",
    "ALTER TABLE audit_log ADD COLUMN ip_hash TEXT",
    "ALTER TABLE coupons ADD COLUMN issued_order TEXT"
  ];
  for (const q of alterQueries) {
    try { await db.prepare(q).run(); } catch (e) { /* column আগে থেকেই আছে */ }
  }

  await db.batch([
    db.prepare("CREATE INDEX IF NOT EXISTS idx_audit_iphash ON audit_log (action, ip_hash, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_orders_phone_hash ON orders (phone_hash, created_at)")
  ]);

  await db.prepare(`INSERT OR IGNORE INTO product
    (id, title, description, price, old_price, stock, image, images, colors, sizes,
     delivery_inside, delivery_outside, contact_phone, whatsapp_number, admin_pass)
    VALUES (1, ?, ?, 1490, 2200, 15, ?, ?, ?, ?, 60, 120, '01700000000', '8801700000000', '')`
  ).bind(
    "প্রিমিয়াম স্মার্ট ওয়াচ ও ফ্যাশন কম্বো",
    "১০০% অরিজিনাল প্রোডাক্ট। সাথে পাচ্ছেন ৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি এবং সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা।",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
    '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"]',
    "কালো, সিলভার, গোল্ডেন",
    "M, L, XL"
  ).run();

  const missing = await db.prepare("SELECT id FROM orders WHERE public_id IS NULL OR public_id = ''").all();
  for (const row of missing.results || []) {
    await db.prepare("UPDATE orders SET public_id = ? WHERE id = ?").bind(newPublicId(), row.id).run();
  }
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_public_id ON orders (public_id)").run();
  await encryptLegacyOrders(env);

  // Inventory migration: টেবিল খালি থাকলে বর্তমান স্টক থেকে শুরু
  const invCount = await db.prepare("SELECT COUNT(*) AS c FROM inventory").first();
  if (!invCount || invCount.c === 0) {
    const prod = await db.prepare("SELECT colors, sizes, stock FROM product WHERE id = 1").first();
    const cl = prod ? splitList(prod.colors) : [];
    const sl = prod ? splitList(prod.sizes) : [];
    const legacyStock = Math.max(0, Number(prod && prod.stock) || 0);
    if (cl.length === 0 && sl.length === 0) {
      await db.prepare("INSERT OR IGNORE INTO inventory (color, size, qty) VALUES ('', '', ?)")
        .bind(legacyStock).run();
    } else {
      // Legacy stock is aggregate-only; preserve it on the first valid variant.
      await syncInventory(db, cl, sl);
      await db.prepare("UPDATE inventory SET qty = ? WHERE color = ? AND size = ?")
        .bind(legacyStock, cl[0] || "", sl[0] || "").run();
    }
    await syncTotal(db);
  }

  // Admin reset (একবারই)। আগের migration-এর চিহ্ন থাকলে admin মুছবে না।
  const done = await db.prepare(
    "SELECT k FROM settings WHERE k IN ('admin_reset_v2', 'schema_version')"
  ).all();
  const da = defaultAdmin(env);
  if ((!done.results || done.results.length === 0) && da.user && da.pass) {
    const salt = randomHex(16);
    const hash = await hashPassword(da.pass, salt);
    await db.batch([
      db.prepare("DELETE FROM sessions"),
      db.prepare("DELETE FROM admin_users"),
      db.prepare("INSERT INTO admin_users (username, password_hash, salt, role) VALUES (?, ?, ?, 'admin')")
        .bind(da.user.toLowerCase(), hash, salt),
      db.prepare("INSERT OR REPLACE INTO settings (k, v) VALUES ('admin_reset_v2', '1')")
    ]);
  }

  schemaReady = true;
}

/* ============================================================
   Audit log  (IP: encrypted, খোঁজার জন্য ip_hash)
   ============================================================ */

async function audit(env, actor, action, target, rawIp) {
  try {
    const ipHash = await hashIp(env, rawIp);
    const ipEnc = await encryptField(env, rawIp || "unknown");
    await env.DB.prepare(
      "INSERT INTO audit_log (actor, action, target, ip, ip_hash) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      String(actor || "").slice(0, 40),
      action,
      String(target || "").slice(0, 200),
      ipEnc,
      ipHash
    ).run();
  } catch (e) {
    console.error("audit failed", e);
  }
}

/* ============================================================
   Session / Authorization
   ============================================================ */

async function getSession(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+([a-f0-9]{64})$/i);
  if (!m) return null;

  const tokenHash = await sha256Hex(m[1].toLowerCase());
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, s.expires_at
     FROM sessions s JOIN admin_users u ON u.id = s.user_id
     WHERE s.token_hash = ?`
  ).bind(tokenHash).first();

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  return { id: row.id, username: row.username, tokenHash };
}

async function authorize(request, env) {
  const session = await getSession(request, env);
  if (!session) throw new HttpError(401, "লগইন করুন!");
  return session;
}

async function createSession(env, userId) {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(Date.now()).run();
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
  ).bind(tokenHash, userId, Date.now() + SESSION_TTL_MS).run();
  return token;
}

// ডিফল্ট পাসওয়ার্ড এখনো ব্যবহার হচ্ছে কিনা (reload-এর পরেও সঠিক দেখাবে)
async function isDefaultPassword(env, user) {
  const da = defaultAdmin(env);
  if (!da.pass || !user) return false;
  return safeEqual(await hashPassword(da.pass, user.salt), user.password_hash);
}

/* ============================================================
   Product
   ============================================================ */

async function getProductRow(db) {
  return db.prepare(
    `SELECT id, title, description, price, old_price, stock, image, images,
      colors, sizes, delivery_inside, delivery_outside, contact_phone, whatsapp_number,
      image_ratio, badge_pos, trust_items, faqs, notices,
      topbar_bn, topbar_en, topbar_size, topbar_align, topbar_offset, topbar_pad,
      topbar_lang_show, topbar_lang_size, is_active,
      bulk_enabled, bulk_min_qty, bulk_type, bulk_value
     FROM product WHERE id = 1`
  ).first();
}

/** Website ও admin-এর জন্য সাফ করা product object */
function productView(p) {
  if (!p) return null;
  let images = [];
  try { images = JSON.parse(p.images || "[]"); } catch (e) { images = []; }
  if (!Array.isArray(images)) images = [];
  images = images.filter((s) => typeof s === "string" && isAllowedImage(s));
  if (!images.length && p.image && isAllowedImage(p.image)) images = [p.image];

  return {
    id: p.id,
    title: p.title || "",
    description: p.description || "",
    price: p.price,
    old_price: p.old_price,
    stock: p.stock,
    images,
    image: images[0] || "",
    colors: p.colors || "",
    sizes: p.sizes || "",
    delivery_inside: p.delivery_inside,
    delivery_outside: p.delivery_outside,
    contact_phone: p.contact_phone || "",
    whatsapp_number: p.whatsapp_number || "",
    image_ratio: RATIOS.includes(p.image_ratio) ? p.image_ratio : "auto",
    badge_pos: BADGE_POS.includes(p.badge_pos) ? p.badge_pos : "tl",
    trust: cleanTrust(parseArrayOr(p.trust_items, DEFAULT_TRUST)),
    faqs: cleanFaqs(parseArrayOr(p.faqs, DEFAULT_FAQS)),
    notices: cleanNotices(parseArrayOr(p.notices, [])),
    topbar: {
      bn: p.topbar_bn || LANDING_STRINGS.topbar[0],
      en: p.topbar_en || LANDING_STRINGS.topbar[1],
      size: clampInt(p.topbar_size, 9, 32, 13),
      align: TOPBAR_ALIGN.includes(p.topbar_align) ? p.topbar_align : "center",
      offset: clampInt(p.topbar_offset, -120, 120, 0),
      pad: clampInt(p.topbar_pad, 0, 40, 10),
      langShow: p.topbar_lang_show == null ? true : Number(p.topbar_lang_show) !== 0,
      langSize: clampInt(p.topbar_lang_size, 8, 28, 12)
    },
    active: Number(p.is_active) !== 0
  };
}

/* ============================================================
   Inventory (রঙ × সাইজ ভিত্তিক স্টক)
   ============================================================ */

function syncTotalStmt(db) {
  return db.prepare("UPDATE product SET stock = (SELECT COALESCE(SUM(qty), 0) FROM inventory) WHERE id = 1");
}

async function syncTotal(db) {
  await syncTotalStmt(db).run();
}

async function syncInventory(db, colors, sizes) {
  const cs = colors.length ? colors : [""];
  const ss = sizes.length ? sizes : [""];
  const keep = new Set();
  const stmts = [];
  for (const c of cs) {
    for (const s of ss) {
      keep.add(c + "|" + s);
      stmts.push(db.prepare("INSERT OR IGNORE INTO inventory (color, size, qty) VALUES (?, ?, 0)").bind(c, s));
    }
  }
  const { results } = await db.prepare("SELECT color, size FROM inventory").all();
  for (const r of results || []) {
    if (!keep.has(r.color + "|" + r.size)) {
      stmts.push(db.prepare("DELETE FROM inventory WHERE color = ? AND size = ?").bind(r.color, r.size));
    }
  }
  stmts.push(syncTotalStmt(db));
  await db.batch(stmts);
}

async function takeStock(db, color, size, qty) {
  const r = await db.prepare(
    "UPDATE inventory SET qty = qty - ? WHERE color = ? AND size = ? AND qty >= ?"
  ).bind(qty, color, size, qty).run();
  return !!(r.meta && r.meta.changes > 0);
}

function addStockStmt(db, color, size, qty) {
  return db.prepare("UPDATE inventory SET qty = qty + ? WHERE color = ? AND size = ?").bind(qty, color, size);
}

async function getInventory(db) {
  const { results } = await db.prepare("SELECT color, size, qty FROM inventory").all();
  return results || [];
}

// অর্ডারের প্রতিটি কালার/সাইজ লাইন (বাতিল বা ডিলিটে স্টক ঠিকভাবে ফেরাতে)
async function getOrderLines(env, id, qtyFallback) {
  const r = await env.DB.prepare(
    "SELECT selected_color AS c, selected_size AS s, lines_json AS lj FROM orders WHERE id = ?"
  ).bind(id).first();
  const lines = parseLines(r && r.lj);
  if (lines.length) return lines;
  return [{ color: variantOf(r && r.c), size: variantOf(r && r.s), qty: Number(qtyFallback) || 0 }];
}

/* ============================================================
   Orders: search, pagination, stats
   ============================================================ */

const ORDER_COLS = `public_id, customer_name, phone, address, selected_color, selected_size,
  delivery_area, delivery_charge, quantity, total, status, created_at, note, subtotal,
  bulk_discount, coupon_discount, coupon_code, lines_json`;

async function searchOrders(env, opts) {
  const db = env.DB;
  const raw = String(opts.q || "").trim().replace(/^#/, "").slice(0, 100);
  const where = [];
  const binds = [];

  if (raw) {
    const upper = raw.toUpperCase();
    if (/^NL/.test(upper)) {
      // অর্ডার আইডি (NL-...) — ফোন নাম্বারের dash এখানে পড়বে না
      where.push("instr(public_id, ?) > 0");
      binds.push(upper);
    } else if (/^[\d+\s-]+$/.test(raw) && digitsOnly(raw).length >= 5) {
      where.push("phone_hash = ?");
      binds.push(await blindIndex(env, "phone", digitsOnly(raw)));
    } else {
      where.push("name_hash = ?");
      binds.push(await blindIndex(env, "name", raw));
    }
  }
  if (STATUSES.includes(opts.status)) {
    where.push("status = ?");
    binds.push(opts.status);
  }
  if (opts.range === "today") {
    where.push("date(created_at, '+6 hours') = date('now', '+6 hours')");
  } else if (opts.range === "7d") {
    where.push("created_at >= datetime('now', '-7 days')");
  }

  const offset = Math.max(0, Math.min(100000, toInt(opts.offset, 0)));
  const sql = `SELECT ${ORDER_COLS} FROM orders` +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY id DESC LIMIT ? OFFSET ?";
  binds.push(PAGE_SIZE + 1, offset);

  const { results } = await db.prepare(sql).bind(...binds).all();
  const list = results || [];
  const page = list.slice(0, PAGE_SIZE);
  for (const o of page) {
    o.customer_name = await decryptField(env, o.customer_name);
    o.phone = await decryptField(env, o.phone);
    o.address = await decryptField(env, o.address);
    o.note = await decryptField(env, o.note);
    o.lines = parseLines(o.lines_json);
    delete o.lines_json;
  }
  return { orders: page, hasMore: list.length > PAGE_SIZE };
}

async function getStats(db) {
  return db.prepare(`SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END), 0) AS confirmed,
      COALESCE(SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END), 0) AS delivered,
      COALESCE(SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END), 0) AS cancelled,
      COALESCE(SUM(CASE WHEN status = 'Delivered' THEN total ELSE 0 END), 0) AS delivered_revenue,
      COALESCE(SUM(CASE WHEN date(created_at, '+6 hours') = date('now', '+6 hours') THEN 1 ELSE 0 END), 0) AS today
    FROM orders`).first();
}

/* ============================================================
   FCM push
   ============================================================ */

function b64urlBytes(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64url(text) {
  return b64urlBytes(new TextEncoder().encode(text));
}

async function getGoogleAccessToken(env) {
  const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64url(JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = unsigned + "." + b64urlBytes(new Uint8Array(sig));

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("FCM token error");
  return data.access_token;
}

async function notifyNewOrder(env, order) {
  const { results } = await env.DB.prepare("SELECT token FROM devices").all();
  if (!results || results.length === 0) return;
  const access = await getGoogleAccessToken(env);
  const url = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;
  await Promise.all(results.map(async (d) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token: d.token,
          notification: { title: "🛒 নতুন অর্ডার!", body: `${order.publicId} - ${order.name} - ৳${order.total}` },
          data: { orderId: order.publicId },
          android: { priority: "HIGH", notification: { channel_id: "orders", sound: "default" } }
        }
      })
    });
    if (res.status === 404 || res.status === 400) {
      await env.DB.prepare("DELETE FROM devices WHERE token = ?").bind(d.token).run();
    }
  }));
}

/* ============================================================
   Pricing, bulk offer, coupons, rewards
   ============================================================ */

function randomCode(n) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  let s = "";
  for (const b of bytes) s += ID_ALPHABET[b % ID_ALPHABET.length];
  return s;
}

function bulkDiscount(p, qty, subtotal) {
  if (!Number(p.bulk_enabled)) return 0;
  const min = Math.max(2, Number(p.bulk_min_qty) || 2);
  if (qty < min) return 0;
  const v = Math.max(0, Number(p.bulk_value) || 0);
  const d = p.bulk_type === "fixed" ? Math.round(v) : Math.round(subtotal * Math.min(100, v) / 100);
  return Math.max(0, Math.min(subtotal, d));
}

// কুপন যাচাই: { row, error }
async function checkCoupon(env, codeRaw, phoneDigits) {
  const code = String(codeRaw || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);
  if (!code) return { row: null, error: "" };
  const c = await env.DB.prepare("SELECT * FROM coupons WHERE code = ?").bind(code).first();
  if (!c) return { row: null, error: "কুপন কোডটি সঠিক নয়।" };
  if (!Number(c.active)) return { row: null, error: "এই কুপনটি এখন সক্রিয় নেই।" };
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
    return { row: null, error: "কুপনের মেয়াদ শেষ হয়ে গেছে।" };
  }
  if (Number(c.max_uses) > 0 && Number(c.uses) >= Number(c.max_uses)) {
    return { row: null, error: "এই কুপনটি ইতিমধ্যে ব্যবহার হয়ে গেছে।" };
  }
  if (Number(c.is_personal) && phoneDigits && c.owner_hash !== (await blindIndex(env, "phone", phoneDigits))) {
    return { row: null, error: "এই কুপনটি অন্য নাম্বারের জন্য।" };
  }
  return { row: c, error: "" };
}

async function computeQuote(env, p, qty, area, codeRaw, phoneDigits) {
  const price = Number(p.price) || 0;
  const subtotal = price * qty;
  const bulk = bulkDiscount(p, qty, subtotal);
  const afterBulk = subtotal - bulk;
  const delivery = area === "outside" ? Number(p.delivery_outside ?? 120)
    : area === "inside" ? Number(p.delivery_inside ?? 60) : 0;

  const chk = await checkCoupon(env, codeRaw, phoneDigits);
  let coupon = null;
  let couponPending = false;
  const couponError = chk.error || "";
  if (!couponError && chk.row) {
    if (Number(chk.row.is_personal) && !phoneDigits) {
      couponPending = true;
    } else {
      const amount = Math.round(afterBulk * Number(chk.row.percent) / 100);
      coupon = { code: chk.row.code, percent: Number(chk.row.percent), amount };
    }
  }
  const total = afterBulk - (coupon ? coupon.amount : 0) + delivery;
  return {
    quantity: qty,
    subtotal,
    bulk,
    coupon,
    couponError,
    couponPending,
    delivery,
    deliveryKnown: !!area,
    total,
    bulkInfo: {
      enabled: !!Number(p.bulk_enabled),
      min: Math.max(2, Number(p.bulk_min_qty) || 2),
      type: p.bulk_type === "fixed" ? "fixed" : "percent",
      value: Number(p.bulk_value) || 0
    }
  };
}

// অর্ডার সফল হলে পুরস্কার কুপন নিয়ম থাকলে গ্রাহকের জন্য একটি নিজস্ব কোড
async function issueReward(env, phoneIdx, isFirst, orderId) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM coupons WHERE is_personal = 0 AND active = 1 AND reward_rule != 'none' ORDER BY id"
  ).all();
  const tpl = (results || []).find((c) => c.reward_rule === "every" || (c.reward_rule === "first" && isFirst));
  if (!tpl) return null;
  const code = "TY" + randomCode(6);
  const expires = new Date(Date.now() + COUPON_REWARD_DAYS * 86400000).toISOString();
  await env.DB.prepare(
    "INSERT INTO coupons (code, percent, max_uses, uses, expires_at, active, reward_rule, valid_days, is_personal, owner_hash, template_id, issued_order) VALUES (?, ?, 1, 0, ?, 1, 'none', ?, 1, ?, ?, ?)"
  ).bind(code, Number(tpl.percent), expires, COUPON_REWARD_DAYS, phoneIdx, tpl.id, orderId || null).run();
  return { code, percent: Number(tpl.percent), days: COUPON_REWARD_DAYS };
}

async function getNotes(db) {
  const { results } = await db.prepare("SELECT k, v FROM settings WHERE k LIKE 'note\\_%' ESCAPE '\\'").all();
  const out = {};
  for (const r of results || []) out[r.k] = r.v || "";
  return out;
}

/* ============================================================
   Worker entry & routing
   ============================================================ */

export default {
  async fetch(request, env) {
    const nonce = randomHex(16);
    const res = await route(request, env, nonce);
    return secure(res, nonce);
  }
};

async function route(request, env, nonce) {
  const path = new URL(request.url).pathname;

  if (!env.DATA_KEY || env.DATA_KEY.length < 16) {
    return new Response("Setup incomplete: DATA_KEY secret যোগ করুন।", { status: 500 });
  }

  try {
    await ensureSchema(env);
  } catch (err) {
    console.error("Schema error", err);
    return new Response("Database Error: 'DB' D1 binding check করুন।", { status: 500 });
  }

  if (path.startsWith("/api/")) {
    return handleApi(request, env, path);
  }

  if (path === "/admin" || path === "/admin/" || path === "/admin.html") {
    return new Response(renderAdminHTML(nonce), {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }

  if (path !== "/" && path !== "/index.html") {
    return new Response("পেজটি পাওয়া যায়নি", { status: 404, headers: { "Content-Type": "text/plain;charset=UTF-8" } });
  }

  const [row, inv, notes] = await Promise.all([getProductRow(env.DB), getInventory(env.DB), getNotes(env.DB)]);
  if (!row) return new Response("Product configure করা নেই।", { status: 503 });
  if (Number(row.is_active) === 0) {
    return new Response(renderInactiveHTML(), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
  }

  return new Response(renderLandingHTML(productView(row), inv, nonce, notes), {
    headers: { "Content-Type": "text/html;charset=UTF-8" }
  });
}

/* ============================================================
   API
   ============================================================ */

async function handleApi(request, env, path) {
  if (request.method !== "GET") {
    const origin = request.headers.get("Origin");
    const site = request.headers.get("Sec-Fetch-Site");
    let originHost = "";
    if (origin) {
      try { originHost = new URL(origin).host; } catch (e) { originHost = "invalid"; }
    }
    if ((origin && originHost !== new URL(request.url).host) || site === "cross-site") {
      return fail(403, "এই অনুরোধ অনুমোদিত নয়।");
    }
  }
  try {
    return await apiRoutes(request, env, path);
  } catch (err) {
    if (err instanceof HttpError) return fail(err.status, err.message);
    console.error("API error", err);
    return fail(500, "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন।");
  }
}

async function apiRoutes(request, env, path) {
  const m = request.method;
  const rawIp = getIp(request);

  /* ---------- Auth ---------- */

  if (path === "/api/admin/login" && m === "POST") {
    const ipHash = await hashIp(env, rawIp);
    const ipKey = "login:ip:" + ipHash;
    const body = await readJson(request);
    const username = String(body.username ?? "").trim().toLowerCase().slice(0, 40);
    const password = String(body.password ?? "");
    if (!username || !password) return fail(400, "ইউজারনেম ও পাসওয়ার্ড দিন!");
    if (password.length > 200) return fail(400, "পাসওয়ার্ড ৮–২০০ অক্ষরের হতে হবে!");

    const userKey = "login:user:" + await blindIndex(env, "login-user", username);
    const [ipFails, userFails] = await Promise.all([
      getRateLimitHits(env.DB, ipKey, LOGIN_WINDOW_MS),
      getRateLimitHits(env.DB, userKey, LOGIN_WINDOW_MS)
    ]);
    if (ipFails >= LOGIN_IP_FAIL_LIMIT || userFails >= LOGIN_FAIL_LIMIT) {
      return fail(429, "অনেকবার ভুল চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।");
    }

    const user = await env.DB.prepare(
      "SELECT id, username, password_hash, salt FROM admin_users WHERE username = ?"
    ).bind(username).first();
    const hash = await hashPassword(password, user ? user.salt : "00".repeat(16));
    const ok = !!user && safeEqual(hash, user.password_hash);
    if (!ok) {
      await Promise.all([
        incrementRateLimit(env.DB, ipKey, LOGIN_WINDOW_MS),
        incrementRateLimit(env.DB, userKey, LOGIN_WINDOW_MS)
      ]);
      await audit(env, username, "login_fail", "", rawIp);
      return fail(401, "ইউজারনেম বা পাসওয়ার্ড ভুল!");
    }

    await clearRateLimits(env.DB, [userKey]);
    await audit(env, user.username, "login_ok", "", rawIp);
    await env.DB.prepare("DELETE FROM audit_log WHERE created_at < datetime('now', '-90 days')").run();
    const token = await createSession(env, user.id);
    return json({
      token,
      user: { id: user.id, username: user.username },
      mustChangePassword: await isDefaultPassword(env, user)
    });
  }

  if (path === "/api/admin/logout" && m === "POST") {
    const session = await getSession(request, env);
    if (session) {
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(session.tokenHash).run();
    }
    return json({ success: true });
  }

  if (path === "/api/admin/logout-all" && m === "POST") {
    const s = await authorize(request, env);
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(s.id).run();
    await audit(env, s.username, "logout_all", "", rawIp);
    return json({ success: true });
  }

  if (path === "/api/admin/me" && m === "GET") {
    const s = await authorize(request, env);
    const u = await env.DB.prepare("SELECT password_hash, salt FROM admin_users WHERE id = ?").bind(s.id).first();
    return json({
      user: { id: s.id, username: s.username },
      mustChangePassword: await isDefaultPassword(env, u)
    });
  }

  if (path === "/api/admin/me/password" && m === "POST") {
    const s = await authorize(request, env);
    const body = await readJson(request);
    const current = String(body.current ?? "");
    const next = String(body.new ?? "");
    if (next.length < 8 || next.length > 200) throw new HttpError(400, "নতুন পাসওয়ার্ড ৮–২০০ অক্ষরের হতে হবে!");
    if (next === current) throw new HttpError(400, "নতুন পাসওয়ার্ড আগেরটির থেকে আলাদা হতে হবে!");

    const user = await env.DB.prepare("SELECT password_hash, salt FROM admin_users WHERE id = ?").bind(s.id).first();
    if (!user) throw new HttpError(404, "ইউজার পাওয়া যায়নি!");
    const check = await hashPassword(current, user.salt);
    if (!safeEqual(check, user.password_hash)) throw new HttpError(400, "বর্তমান পাসওয়ার্ড ভুল!");

    const salt = randomHex(16);
    const hash = await hashPassword(next, salt);
    await env.DB.batch([
      env.DB.prepare("UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?").bind(hash, salt, s.id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(s.id)
    ]);
    await audit(env, s.username, "password_change", "", rawIp);
    return json({ success: true });
  }

  /* ---------- Admin users ---------- */

  if (path === "/api/admin/users" && m === "GET") {
    await authorize(request, env);
    const { results } = await env.DB.prepare(
      "SELECT id, username, created_at FROM admin_users ORDER BY id"
    ).all();
    return json({ users: results || [] });
  }

  if (path === "/api/admin/users" && m === "POST") {
    const s = await authorize(request, env);
    const body = await readJson(request);
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
      throw new HttpError(400, "ইউজারনেম ৩-৩২ অক্ষর, শুধু a-z, 0-9, _ . - ব্যবহার করুন।");
    }
    if (password.length < 8 || password.length > 200) throw new HttpError(400, "পাসওয়ার্ড ৮–২০০ অক্ষরের হতে হবে!");

    const exists = await env.DB.prepare("SELECT id FROM admin_users WHERE username = ?").bind(username).first();
    if (exists) throw new HttpError(409, "এই ইউজারনেম আগে থেকেই আছে!");

    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    await env.DB.prepare(
      "INSERT INTO admin_users (username, password_hash, salt, role) VALUES (?, ?, ?, 'admin')"
    ).bind(username, hash, salt).run();
    await audit(env, s.username, "admin_add", username, rawIp);
    return json({ success: true });
  }

  if (path === "/api/admin/users/reset" && m === "POST") {
    const s = await authorize(request, env);
    const body = await readJson(request);
    const id = toInt(body.id, NaN);
    const password = String(body.password ?? "");
    if (!Number.isFinite(id)) throw new HttpError(400, "Invalid user");
    if (password.length < 8 || password.length > 200) throw new HttpError(400, "পাসওয়ার্ড ৮–২০০ অক্ষরের হতে হবে!");

    const target = await env.DB.prepare("SELECT username FROM admin_users WHERE id = ?").bind(id).first();
    if (!target) throw new HttpError(404, "ইউজার পাওয়া যায়নি!");

    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    await env.DB.batch([
      env.DB.prepare("UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?").bind(hash, salt, id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id)
    ]);
    await audit(env, s.username, "admin_reset", target.username, rawIp);
    return json({ success: true });
  }

  if (path === "/api/admin/users/delete" && m === "POST") {
    const s = await authorize(request, env);
    const body = await readJson(request);
    const id = toInt(body.id, NaN);
    if (!Number.isFinite(id)) throw new HttpError(400, "Invalid user");
    if (id === s.id) throw new HttpError(400, "নিজেকে ডিলিট করা যাবে না!");

    const target = await env.DB.prepare("SELECT username FROM admin_users WHERE id = ?").bind(id).first();
    if (!target) return json({ success: true });

    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
      env.DB.prepare("DELETE FROM admin_users WHERE id = ?").bind(id)
    ]);
    await audit(env, s.username, "admin_delete", target.username, rawIp);
    return json({ success: true });
  }

  /* ---------- Admin: stats, orders, logs ---------- */

  if (path === "/api/admin/stats" && m === "GET") {
    await authorize(request, env);
    const stats = await getStats(env.DB);
    const { results: daily } = await env.DB.prepare(
      "SELECT date(created_at, '+6 hours') AS d, COUNT(*) AS c, COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total ELSE 0 END), 0) AS t FROM orders WHERE created_at >= datetime('now', '-7 days') GROUP BY d ORDER BY d"
    ).all();
    stats.daily = daily || [];
    const product = productView(await getProductRow(env.DB));
    return json({ stats, product });
  }

  if (path === "/api/admin/orders" && m === "GET") {
    await authorize(request, env);
    const url = new URL(request.url);
    const result = await searchOrders(env, {
      q: url.searchParams.get("q") || "",
      status: url.searchParams.get("status") || "all",
      range: url.searchParams.get("range") || "all",
      offset: url.searchParams.get("offset") || 0
    });
    return json(result);
  }

  if (path === "/api/admin/logs" && m === "GET") {
    await authorize(request, env);
    const { results } = await env.DB.prepare(
      "SELECT actor, action, target, ip, created_at FROM audit_log ORDER BY id DESC LIMIT 200"
    ).all();
    const logs = [];
    for (const l of results || []) {
      logs.push({ ...l, ip: await decryptField(env, l.ip) });
    }
    return json({ logs });
  }

  /* ---------- Admin: product ---------- */

  if (path === "/api/admin/product" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request, MAX_PRODUCT_BODY);

    const title = String(b.title ?? "").trim().slice(0, 200);
    if (!title) throw new HttpError(400, "প্রোডাক্টের নাম লিখুন!");

    const description = String(b.description ?? "").slice(0, 5000);
    const price = toInt(b.price, NaN);
    const oldPrice = toInt(b.old_price, 0);
    const stock = toInt(b.stock, 0);
    const deliveryInside = toInt(b.delivery_inside, 60);
    const deliveryOutside = toInt(b.delivery_outside, 120);

    if (!Number.isFinite(price) || price < 0) throw new HttpError(400, "সঠিক অফার মূল্য দিন!");
    if ([oldPrice, stock, deliveryInside, deliveryOutside].some((n) => n < 0)) {
      throw new HttpError(400, "সংখ্যা ঋণাত্মক হতে পারবে না!");
    }

    const images = cleanImages(b.images);
    if (images.length === 0) throw new HttpError(400, "অন্তত একটি প্রোডাক্টের ছবি যুক্ত করুন!");
    if (images.length > MAX_IMAGES) throw new HttpError(400, "সর্বোচ্চ " + MAX_IMAGES + "টি ছবি যুক্ত করা যাবে!");
    if (!images.every(isAllowedImage)) throw new HttpError(400, "ছবির লিংক বা ফাইল সঠিক নয়!");

    const imagesJson = JSON.stringify(images);
    if (imagesJson.length > MAX_IMAGES_BYTES) {
      throw new HttpError(413, "ছবির সাইজ অনেক বড়। কম সংখ্যক ছবি দিন বা ছবি ছোট করুন।");
    }

    const notices = cleanNotices(b.notices);
    const noticesJson = JSON.stringify(notices);
    if (noticesJson.length > MAX_NOTICES_BYTES) throw new HttpError(413, "নোটিসের ছবি অনেক বড়। ছোট ছবি দিন।");

    const colors = String(b.colors ?? "").trim().slice(0, 300);
    const sizes = String(b.sizes ?? "").trim().slice(0, 300);
    const phone = String(b.contact_phone ?? "").trim();
    const wa = String(b.whatsapp_number ?? "").replace(/[^0-9]/g, "");
    const ratio = RATIOS.includes(b.image_ratio) ? b.image_ratio : "auto";
    const badgePos = BADGE_POS.includes(b.badge_pos) ? b.badge_pos : "tl";
    const trustJson = JSON.stringify(cleanTrust(b.trust));
    const faqJson = JSON.stringify(cleanFaqs(b.faqs));

    const tbBn = String(b.topbar_bn ?? "").trim().slice(0, 200);
    const tbEn = String(b.topbar_en ?? "").trim().slice(0, 200);
    const tbSize = clampInt(b.topbar_size, 9, 32, 13);
    const tbAlign = TOPBAR_ALIGN.includes(b.topbar_align) ? b.topbar_align : "center";
    const tbOffset = clampInt(b.topbar_offset, -120, 120, 0);
    const tbPad = clampInt(b.topbar_pad, 0, 40, 10);
    const tbLangShow = (b.topbar_lang_show === false || b.topbar_lang_show === 0 || b.topbar_lang_show === "0") ? 0 : 1;
    const tbLangSize = clampInt(b.topbar_lang_size, 8, 28, 12);
    const isActive = (b.is_active === false || b.is_active === 0 || b.is_active === "0") ? 0 : 1;

    if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) throw new HttpError(400, "কল নাম্বার সঠিক নয়!");
    if (wa && !/^[0-9]{10,15}$/.test(wa)) throw new HttpError(400, "WhatsApp নাম্বার সঠিক নয়!");

    await env.DB.prepare(
      `UPDATE product SET title = ?, description = ?, price = ?, old_price = ?,
        image = ?, images = ?, colors = ?, sizes = ?, delivery_inside = ?, delivery_outside = ?,
        contact_phone = ?, whatsapp_number = ?, image_ratio = ?, badge_pos = ?,
        trust_items = ?, faqs = ?, notices = ?,
        topbar_bn = ?, topbar_en = ?, topbar_size = ?, topbar_align = ?, topbar_offset = ?, topbar_pad = ?,
        topbar_lang_show = ?, topbar_lang_size = ?, is_active = ?
       WHERE id = 1`
    ).bind(
      title, description, price, oldPrice,
      images[0], imagesJson, colors, sizes,
      deliveryInside, deliveryOutside, phone, wa, ratio, badgePos,
      trustJson, faqJson, noticesJson,
      tbBn, tbEn, tbSize, tbAlign, tbOffset, tbPad, tbLangShow, tbLangSize, isActive
    ).run();

    await syncInventory(env.DB, splitList(colors), splitList(sizes));
    await audit(env, s.username, "product_update", title, rawIp);
    return json({ success: true });
  }

  /* ---------- Public: quote & order ---------- */

  if (path === "/api/quote" && m === "POST") {
    const b = await readJson(request);
    const p = await env.DB.prepare(
      "SELECT price, delivery_inside, delivery_outside, bulk_enabled, bulk_min_qty, bulk_type, bulk_value FROM product WHERE id = 1"
    ).first();
    if (!p) throw new HttpError(404, "প্রোডাক্ট পাওয়া যায়নি!");
    const qty = Math.min(MAX_QTY, Math.max(1, toInt(b.quantity, 1)));
    const area = b.area === "inside" || b.area === "outside" ? b.area : "";
    return json(await computeQuote(env, p, qty, area, b.coupon, digitsOnly(b.phone)));
  }

  if (path === "/api/order" && m === "POST") {
    const b = await readJson(request);
    const name = String(b.name ?? "").trim();
    const address = String(b.address ?? "").trim();
    const phone = String(b.phone ?? "").replace(/[\s-]/g, "");
    const area = b.area;
    const qty = Math.min(MAX_QTY, Math.max(1, toInt(b.quantity, 1)));

    if (name.length < 2 || name.length > 100) throw new HttpError(400, "সঠিক নাম লিখুন!");
    if (address.length < 5 || address.length > 500) throw new HttpError(400, "সম্পূর্ণ ঠিকানা লিখুন!");
    if (!/^01[3-9]\d{8}$/.test(phone)) throw new HttpError(400, "সঠিক মোবাইল নাম্বার দিন (01XXXXXXXXX)!");
    if (area !== "inside" && area !== "outside") throw new HttpError(400, "দয়া করে ডেলিভারি এরিয়া সিলেক্ট করুন!");

    const phoneIdx = await blindIndex(env, "phone", phone);
    const ipHash = await hashIp(env, rawIp);
    const [ipAttempts, phoneAttempts] = await Promise.all([
      incrementRateLimit(env.DB, "order:ip:" + ipHash, ORDER_WINDOW_MS),
      incrementRateLimit(env.DB, "order:phone:" + phoneIdx, ORDER_WINDOW_MS)
    ]);
    if (ipAttempts > ORDER_IP_LIMIT || phoneAttempts > PHONE_ATTEMPT_LIMIT) {
      throw new HttpError(429, "এই উৎস থেকে অনেক অর্ডারের চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।");
    }

    const recentPhone = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM orders WHERE phone_hash = ? AND created_at > datetime('now', '-1 hour')"
    ).bind(phoneIdx).first();
    if (recentPhone && recentPhone.c >= PHONE_ORDER_LIMIT) {
      throw new HttpError(429, "এই নাম্বার থেকে অনেক অর্ডার হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।");
    }

    const product = await env.DB.prepare(
      "SELECT price, stock, colors, sizes, delivery_inside, delivery_outside, is_active, bulk_enabled, bulk_min_qty, bulk_type, bulk_value FROM product WHERE id = 1"
    ).first();
    if (!product) throw new HttpError(404, "প্রোডাক্ট পাওয়া যায়নি!");
    if (Number(product.is_active) === 0) throw new HttpError(400, "এই মুহূর্তে প্রোডাক্টটি অর্ডারের জন্য বন্ধ আছে।");

    const colorList = splitList(product.colors);
    const sizeList = splitList(product.sizes);
    const rawItems = Array.isArray(b.items) ? b.items : [];
    const fallback = { color: String(b.color ?? "").trim(), size: String(b.size ?? "").trim() };
    const lineMap = new Map();
    for (let i = 0; i < qty; i++) {
      const it = rawItems[i] || fallback;
      const c = colorList.length ? String(it.color ?? "").trim() : "";
      const sz = sizeList.length ? String(it.size ?? "").trim() : "";
      if (colorList.length && !colorList.includes(c)) throw new HttpError(400, "সঠিক কালার সিলেক্ট করুন!");
      if (sizeList.length && !sizeList.includes(sz)) throw new HttpError(400, "সঠিক সাইজ সিলেক্ট করুন!");
      const key = c + "|" + sz;
      if (!lineMap.has(key)) lineMap.set(key, { color: c, size: sz, qty: 0 });
      lineMap.get(key).qty += 1;
    }
    const lines = [...lineMap.values()];

    const quote = await computeQuote(env, product, qty, area, b.coupon, phone);
    if (quote.couponError) throw new HttpError(400, quote.couponError);
    if (quote.couponPending) throw new HttpError(400, "কুপন ব্যবহারের জন্য সঠিক ফোন নাম্বার দিন!");

    let couponRow = null;
    if (quote.coupon) {
      const checked = await checkCoupon(env, b.coupon, phone);
      if (checked.error || !checked.row) throw new HttpError(400, checked.error || "এই কুপনটি এইমাত্র ব্যবহার হয়ে গেছে।");
      couponRow = checked.row;
    }

    const prev = await env.DB.prepare("SELECT COUNT(*) AS c FROM orders WHERE phone_hash = ?").bind(phoneIdx).first();
    const isFirst = !prev || Number(prev.c) === 0;
    const deliveryAreaText = area === "outside" ? "ঢাকার বাইরে" : "ঢাকার ভেতরে";
    const couponAmount = quote.coupon ? quote.coupon.amount : 0;
    const couponCode = quote.coupon ? quote.coupon.code : "";
    const selColor = [...new Set(lines.map((l) => l.color).filter(Boolean))].join(", ") || "N/A";
    const selSize = [...new Set(lines.map((l) => l.size).filter(Boolean))].join(", ") || "N/A";
    const linesJson = JSON.stringify(lines);
    const encName = await encryptField(env, name);
    const encPhone = await encryptField(env, phone);
    const encAddr = await encryptField(env, address);
    const nameIdx = await blindIndex(env, "name", name);
    const nowIso = new Date().toISOString();

    const stockChecks = lines.map(() =>
      "AND EXISTS (SELECT 1 FROM inventory WHERE color = ? AND size = ? AND qty >= ?)"
    ).join(" ");
    const couponCheck = couponRow
      ? "AND EXISTS (SELECT 1 FROM coupons WHERE id = ? AND active = 1 AND (max_uses = 0 OR uses < max_uses) AND (expires_at IS NULL OR expires_at > ?) AND (is_personal = 0 OR owner_hash = ?))"
      : "";

    let publicId = "";
    for (let attempt = 0; attempt < 3 && !publicId; attempt++) {
      const candidate = newPublicId();
      const insert = env.DB.prepare(
        `INSERT INTO orders (public_id, customer_name, phone, address, selected_color, selected_size,
          delivery_area, delivery_charge, quantity, total, status, phone_hash, name_hash, enc_v,
          subtotal, bulk_discount, coupon_discount, coupon_code, lines_json)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, '1', ?, ?, ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM product WHERE id = 1 AND is_active = 1)
         ${stockChecks} ${couponCheck}`
      ).bind(
        candidate, encName, encPhone, encAddr, selColor, selSize,
        deliveryAreaText, quote.delivery, qty, quote.total, phoneIdx, nameIdx,
        quote.subtotal, quote.bulk, couponAmount, couponCode, linesJson,
        ...lines.flatMap((l) => [l.color, l.size, l.qty]),
        ...(couponRow ? [couponRow.id, nowIso, phoneIdx] : [])
      );

      const statements = [insert];
      for (const l of lines) {
        statements.push(env.DB.prepare(
          "UPDATE inventory SET qty = qty - ? WHERE color = ? AND size = ? AND qty >= ? AND EXISTS (SELECT 1 FROM orders WHERE public_id = ?)"
        ).bind(l.qty, l.color, l.size, l.qty, candidate));
      }
      if (couponRow) {
        statements.push(env.DB.prepare(
          "UPDATE coupons SET uses = uses + 1 WHERE id = ? AND EXISTS (SELECT 1 FROM orders WHERE public_id = ?)"
        ).bind(couponRow.id, candidate));
      }
      statements.push(env.DB.prepare(
        "UPDATE product SET stock = (SELECT COALESCE(SUM(qty), 0) FROM inventory) WHERE id = 1 AND EXISTS (SELECT 1 FROM orders WHERE public_id = ?)"
      ).bind(candidate));

      try {
        const results = await env.DB.batch(statements);
        if (results[0]?.meta?.changes === 1) publicId = candidate;
      } catch (err) {
        if (/UNIQUE/i.test(String(err && err.message)) && attempt < 2) continue;
        console.error("Atomic order batch failed", err);
        throw new HttpError(500, "অর্ডার সেভ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।");
      }
    }

    if (!publicId) {
      const currentProduct = await env.DB.prepare("SELECT is_active FROM product WHERE id = 1").first();
      if (!currentProduct || Number(currentProduct.is_active) === 0) {
        throw new HttpError(400, "এই মুহূর্তে প্রোডাক্টটি অর্ডারের জন্য বন্ধ আছে।");
      }
      if (couponRow) {
        const checked = await checkCoupon(env, b.coupon, phone);
        if (checked.error || !checked.row) throw new HttpError(400, checked.error || "এই কুপনটি এইমাত্র ব্যবহার হয়ে গেছে।");
      }
      for (const l of lines) {
        const row = await env.DB.prepare("SELECT qty FROM inventory WHERE color = ? AND size = ?")
          .bind(l.color, l.size).first();
        if (!row) throw new HttpError(400, "🙏 দুঃখিত, এই অপশনটি এখন পাওয়া যাচ্ছে না। অন্য অপশন বেছে নিন।");
        if (Number(row.qty) < l.qty) {
          throw new HttpError(400, stockOutMessage(colorList.length > 0, sizeList.length > 0, l.qty, Number(row.qty) || 0, l.color, l.size));
        }
      }
      throw new HttpError(409, "অর্ডারটি প্রসেস করা যায়নি। আবার চেষ্টা করুন।");
    }

    await audit(env, "customer", "order_create", publicId, rawIp);
    let reward = null;
    try { reward = await issueReward(env, phoneIdx, isFirst, publicId); }
    catch (e) { console.error("Reward failed", e); }
    try { await notifyNewOrder(env, { publicId, name, total: quote.total }); }
    catch (e) { console.error("Push failed", e); }

    let giveaway = null;
    try { giveaway = await publicGiveaway(env); } catch (e) { console.error("Giveaway failed", e); }
    return json({ success: true, orderId: publicId, reward, giveaway });
  }

  /* ---------- Admin: order status, note & delete ---------- */

  if (path === "/api/admin/order/status" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const pid = normalizeSearch(b.publicId);
    const status = String(b.status ?? "");
    if (!PUBLIC_ID_RE.test(pid)) throw new HttpError(400, "অর্ডার আইডি সঠিক নয়!");
    if (!STATUSES.includes(status)) throw new HttpError(400, "Invalid status");

    const order = await env.DB.prepare("SELECT id, status, quantity FROM orders WHERE public_id = ?").bind(pid).first();
    if (!order) throw new HttpError(404, "অর্ডার পাওয়া যায়নি!");
    const lines = await getOrderLines(env, order.id, order.quantity);

    if (status === "Cancelled") {
      const stmts = lines.map((l) => env.DB.prepare(
        "UPDATE inventory SET qty = qty + ? WHERE color = ? AND size = ? AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status != 'Cancelled')"
      ).bind(l.qty, l.color, l.size, order.id));
      stmts.push(env.DB.prepare("UPDATE orders SET status = 'Cancelled' WHERE id = ? AND status != 'Cancelled'").bind(order.id));
      stmts.push(syncTotalStmt(env.DB));
      await env.DB.batch(stmts);
    } else if (order.status === "Cancelled") {
      const checks = lines.map(() =>
        "AND EXISTS (SELECT 1 FROM inventory WHERE color = ? AND size = ? AND qty >= ?)"
      ).join(" ");
      const reopen = env.DB.prepare(
        "UPDATE orders SET status = ? WHERE id = ? AND status = 'Cancelled' " + checks
      ).bind(status, order.id, ...lines.flatMap((l) => [l.color, l.size, l.qty]));
      const stmts = [reopen];
      for (const l of lines) {
        stmts.push(env.DB.prepare(
          "UPDATE inventory SET qty = qty - ? WHERE color = ? AND size = ? AND qty >= ? AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = ?)"
        ).bind(l.qty, l.color, l.size, l.qty, order.id, status));
      }
      stmts.push(syncTotalStmt(env.DB));
      const results = await env.DB.batch(stmts);
      if (results[0]?.meta?.changes !== 1) {
        const current = await env.DB.prepare("SELECT status FROM orders WHERE id = ?").bind(order.id).first();
        if (!current) throw new HttpError(404, "অর্ডার পাওয়া যায়নি!");
        if (current.status === "Cancelled") {
          for (const l of lines) {
            const row = await env.DB.prepare("SELECT qty FROM inventory WHERE color = ? AND size = ?")
              .bind(l.color, l.size).first();
            if (!row || Number(row.qty) < l.qty) throw new HttpError(400, "স্টক না থাকায় অর্ডার আবার চালু করা যাবে না!");
          }
        }
        throw new HttpError(409, "অর্ডারের অবস্থা পরিবর্তিত হয়েছে, আবার চেষ্টা করুন।");
      }
    } else {
      const result = await env.DB.prepare(
        "UPDATE orders SET status = ? WHERE id = ? AND status != 'Cancelled'"
      ).bind(status, order.id).run();
      if (!result.meta || result.meta.changes === 0) throw new HttpError(409, "অর্ডারের অবস্থা পরিবর্তিত হয়েছে, আবার চেষ্টা করুন।");
    }

    await audit(env, s.username, "order_status", pid + " → " + status, rawIp);
    return json({ success: true });
  }

  if (path === "/api/admin/order/delete" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const pid = normalizeSearch(b.publicId);
    if (!PUBLIC_ID_RE.test(pid)) throw new HttpError(400, "অর্ডার আইডি সঠিক নয়!");
    const order = await env.DB.prepare("SELECT id, status, quantity FROM orders WHERE public_id = ?").bind(pid).first();
    if (!order) return json({ success: true });

    const lines = await getOrderLines(env, order.id, order.quantity);
    const stmts = [];
    if (order.status !== "Cancelled") {
      for (const l of lines) {
        stmts.push(env.DB.prepare(
          "UPDATE inventory SET qty = qty + ? WHERE color = ? AND size = ? AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status != 'Cancelled')"
        ).bind(l.qty, l.color, l.size, order.id));
      }
    }
    stmts.push(env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(order.id));
    stmts.push(syncTotalStmt(env.DB));
    await env.DB.batch(stmts);
    await audit(env, s.username, "order_delete", pid, rawIp);
    return json({ success: true });
  }

  if (path === "/api/admin/order/note" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const pid = normalizeSearch(b.publicId);
    if (!PUBLIC_ID_RE.test(pid)) throw new HttpError(400, "অর্ডার আইডি সঠিক নয়!");
    const note = String(b.note ?? "").slice(0, 500);
    await env.DB.prepare("UPDATE orders SET note = ? WHERE public_id = ?").bind(await encryptField(env, note), pid).run();
    await audit(env, s.username, "order_note", pid, rawIp);
    return json({ success: true });
  }

  /* ---------- Inventory ---------- */

  if (path === "/api/admin/inventory" && m === "GET") {
    await authorize(request, env);
    return json({ rows: await getInventory(env.DB) });
  }

  if (path === "/api/admin/inventory" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const prod = await env.DB.prepare("SELECT colors, sizes FROM product WHERE id = 1").first();
    const allowedC = prod && splitList(prod.colors).length ? splitList(prod.colors) : [""];
    const allowedS = prod && splitList(prod.sizes).length ? splitList(prod.sizes) : [""];
    const items = Array.isArray(b.items) ? b.items.slice(0, 500) : [];
    const stmts = [];
    for (const it of items) {
      const c = String(it && it.color != null ? it.color : "");
      const sz = String(it && it.size != null ? it.size : "");
      const q = toInt(it && it.qty, NaN);
      if (!allowedC.includes(c) || !allowedS.includes(sz)) continue;
      if (!Number.isFinite(q) || q < 0 || q > 100000) {
        throw new HttpError(400, "স্টকের সংখ্যা ০ থেকে ১,০০,০০০ এর মধ্যে হতে হবে!");
      }
      stmts.push(env.DB.prepare("INSERT OR REPLACE INTO inventory (color, size, qty) VALUES (?, ?, ?)").bind(c, sz, q));
    }
    if (stmts.length) {
      stmts.push(syncTotalStmt(env.DB));
      await env.DB.batch(stmts);
    }
    await audit(env, s.username, "inventory_update", items.length + " items", rawIp);
    return json({ success: true });
  }

  if (path === "/api/admin/inventory/add" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);

    const color = String(b.color ?? "").replace(/,/g, " ").trim().slice(0, 40);
    const size = String(b.size ?? "").replace(/,/g, " ").trim().slice(0, 40);
    const qty = toInt(b.qty, 0);

    if (!color && !size) throw new HttpError(400, "কালার বা সাইজ অন্তত একটি লিখুন!");
    if (qty < 0 || qty > 100000) throw new HttpError(400, "স্টকের সংখ্যা ০ থেকে ১,০০,০০০ এর মধ্যে হতে হবে!");

    const prod = await env.DB.prepare("SELECT colors, sizes FROM product WHERE id = 1").first();
    const colorList = splitList(prod && prod.colors);
    const sizeList = splitList(prod && prod.sizes);

    if (colorList.length > 0 && !color) throw new HttpError(400, "কালার লিখুন!");
    if (sizeList.length > 0 && !size) throw new HttpError(400, "সাইজ লিখুন!");

    if (color && !colorList.includes(color)) colorList.push(color);
    if (size && !sizeList.includes(size)) sizeList.push(size);

    await env.DB.prepare("UPDATE product SET colors = ?, sizes = ? WHERE id = 1")
      .bind(colorList.join(", "), sizeList.join(", ")).run();
    await syncInventory(env.DB, colorList, sizeList);

    await env.DB.batch([
      env.DB.prepare("INSERT OR REPLACE INTO inventory (color, size, qty) VALUES (?, ?, ?)").bind(color, size, qty),
      syncTotalStmt(env.DB)
    ]);

    await audit(env, s.username, "inventory_add", (color || "-") + " / " + (size || "-") + " x" + qty, rawIp);
    return json({ success: true });
  }

  /* ---------- Offers: bulk discount, coupons, website notes ---------- */

  if (path === "/api/admin/offers" && m === "GET") {
    await authorize(request, env);
    const p = await env.DB.prepare("SELECT bulk_enabled, bulk_min_qty, bulk_type, bulk_value FROM product WHERE id = 1").first();
    const { results } = await env.DB.prepare(
      "SELECT id, code, percent, max_uses, uses, expires_at, active, reward_rule, valid_days, is_personal, created_at FROM coupons ORDER BY id DESC LIMIT 400"
    ).all();
    return json({
      bulk: {
        enabled: !!Number(p && p.bulk_enabled),
        min: Math.max(2, Number(p && p.bulk_min_qty) || 2),
        type: p && p.bulk_type === "fixed" ? "fixed" : "percent",
        value: Number(p && p.bulk_value) || 0
      },
      coupons: results || [],
      notes: await getNotes(env.DB),
      totals: await offerTotals(env.DB),
      giveaway: await getGiveaway(env.DB),
      rewardRules: (results || []).filter((c) => !Number(c.is_personal) && Number(c.active) && c.reward_rule !== "none").length
    });
  }

  if (path === "/api/admin/offers/bulk" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const type = b.type === "fixed" ? "fixed" : "percent";
    const enabled = b.enabled ? 1 : 0;
    const min = clampInt(b.min_qty, 2, 100, 2);
    const value = type === "percent" ? clampInt(b.value, 0, 100, 0) : clampInt(b.value, 0, 100000, 0);
    await env.DB.prepare("UPDATE product SET bulk_enabled = ?, bulk_min_qty = ?, bulk_type = ?, bulk_value = ? WHERE id = 1")
      .bind(enabled, min, type, value).run();
    await audit(env, s.username, "bulk_offer", (enabled ? "on" : "off") + " " + min + "+ " + value + (type === "percent" ? "%" : "৳"), rawIp);
    return json({ success: true });
  }

  if (path === "/api/admin/coupons" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    let code = String(b.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
    if (!code) code = randomCode(8);
    if (code.length < 4) throw new HttpError(400, "কুপন কোড কমপক্ষে ৪ অক্ষরের হতে হবে (A-Z, 0-9)।");
    const percent = clampInt(b.percent, 1, 100, 0);
    if (percent < 1) throw new HttpError(400, "ছাড়ের শতাংশ ১ থেকে ১০০ এর মধ্যে দিন।");
    const maxUses = clampInt(b.max_uses, 0, 100000, 0);
    const expDays = clampInt(b.expiry_days, 0, 3650, 0);
    const expiresAt = expDays > 0 ? new Date(Date.now() + expDays * 86400000).toISOString() : null;
    const rule = ["none", "every", "first"].includes(b.reward_rule) ? b.reward_rule : "none";
    const active = b.active === false ? 0 : 1;
    try {
      await env.DB.prepare(
        "INSERT INTO coupons (code, percent, max_uses, expires_at, active, reward_rule, valid_days) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(code, percent, maxUses, expiresAt, active, rule, COUPON_REWARD_DAYS).run();
    } catch (err) {
      if (/UNIQUE/i.test(String(err && err.message))) throw new HttpError(409, "এই কুপন কোডটি আগে থেকেই আছে।");
      throw err;
    }
    await audit(env, s.username, "coupon_create", code + " " + percent + "%", rawIp);
    return json({ success: true, code });
  }

  if (path === "/api/admin/coupons/update" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const id = toInt(b.id, NaN);
    if (!Number.isFinite(id)) throw new HttpError(400, "Invalid coupon");
    await env.DB.prepare("UPDATE coupons SET active = ? WHERE id = ?").bind(b.active ? 1 : 0, id).run();
    await audit(env, s.username, "coupon_update", String(id) + (b.active ? " on" : " off"), rawIp);
    return json({ success: true });
  }

  if (path === "/api/admin/coupons/delete" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const id = toInt(b.id, NaN);
    if (!Number.isFinite(id)) throw new HttpError(400, "Invalid coupon");
    const cc = await env.DB.prepare("SELECT code FROM coupons WHERE id = ?").bind(id).first();
    await env.DB.prepare("DELETE FROM coupons WHERE id = ?").bind(id).run();
    await audit(env, s.username, "coupon_delete", cc ? cc.code : String(id), rawIp);
    return json({ success: true });
  }

  if (path === "/api/admin/coupons/personal" && m === "GET") {
    await authorize(request, env);
    const { results } = await env.DB.prepare(
      "SELECT id, code, percent, max_uses, uses, expires_at, active, reward_rule, valid_days, is_personal, created_at FROM coupons WHERE is_personal = 1 ORDER BY id DESC LIMIT 500"
    ).all();
    return json({ coupons: results || [] });
  }

  if (path === "/api/admin/notes" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const keys = ["note_bulk_bn", "note_bulk_en", "note_coupon_bn", "note_coupon_en"];
    const stmts = keys.map((k) =>
      env.DB.prepare("INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)").bind(k, String(b[k] ?? "").trim().slice(0, 300))
    );
    stmts.push(env.DB.prepare("INSERT OR REPLACE INTO settings (k, v) VALUES ('note_bulk_on', ?)").bind(b.note_bulk_on ? "1" : "0"));
    stmts.push(env.DB.prepare("INSERT OR REPLACE INTO settings (k, v) VALUES ('note_coupon_on', ?)").bind(b.note_coupon_on ? "1" : "0"));
    await env.DB.batch(stmts);
    await audit(env, s.username, "notes_update", "website notes", rawIp);
    return json({ success: true });
  }

  /* ---------- Admin: own username ---------- */

  if (path === "/api/admin/me/username" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const current = String(b.current ?? "");
    const next = String(b.username ?? "").trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,32}$/.test(next)) {
      throw new HttpError(400, "ইউজারনেম ৩-৩২ অক্ষর, শুধু a-z, 0-9, _ . - ব্যবহার করুন।");
    }
    const user = await env.DB.prepare("SELECT password_hash, salt FROM admin_users WHERE id = ?").bind(s.id).first();
    if (!user) throw new HttpError(404, "ইউজার পাওয়া যায়নি!");
    if (!safeEqual(await hashPassword(current, user.salt), user.password_hash)) {
      throw new HttpError(400, "বর্তমান পাসওয়ার্ড ভুল!");
    }
    if (next === s.username) throw new HttpError(400, "নতুন ইউজারনেম আগেরটির থেকে আলাদা হতে হবে!");
    const taken = await env.DB.prepare("SELECT id FROM admin_users WHERE username = ?").bind(next).first();
    if (taken) throw new HttpError(409, "এই ইউজারনেম আগে থেকেই আছে!");
    await env.DB.prepare("UPDATE admin_users SET username = ? WHERE id = ?").bind(next, s.id).run();
    await audit(env, s.username, "username_change", next, rawIp);
    return json({ success: true, username: next });
  }

  /* ---------- Admin: printer settings (Invoice & POS) ---------- */

  if (path === "/api/admin/print" && m === "GET") {
    await authorize(request, env);
    const { results } = await env.DB.prepare(
      "SELECT k, v FROM settings WHERE k IN ('print_invoice', 'print_pos')"
    ).all();
    const print = { invoice: cleanPrintCfg("invoice", null), pos: cleanPrintCfg("pos", null) };
    for (const r of results || []) {
      const kind = r.k === "print_pos" ? "pos" : "invoice";
      let raw = null;
      try { raw = JSON.parse(r.v || "null"); } catch (e) { raw = null; }
      print[kind] = cleanPrintCfg(kind, raw);
    }
    return json({ print });
  }

  if (path === "/api/admin/print" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request, 400 * 1024);
    const kind = b.kind === "pos" ? "pos" : "invoice";
    const saved = JSON.stringify(cleanPrintCfg(kind, b.cfg));
    if (saved.length > 280 * 1024) throw new HttpError(413, "প্রিন্ট সেটিং অনেক বড়।");
    await env.DB.prepare("INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)").bind("print_" + kind, saved).run();
    await audit(env, s.username, "print_save", kind, rawIp);
    return json({ success: true });
  }

  /* ---------- Admin: reward coupon history & security overview ---------- */

  if (path === "/api/admin/rewards" && m === "GET") {
    await authorize(request, env);
    const { results } = await env.DB.prepare(
      `SELECT c.id, c.code, c.percent, c.max_uses, c.uses, c.expires_at, c.active, c.created_at, c.issued_order,
        (SELECT o.public_id FROM orders o WHERE o.coupon_code = c.code ORDER BY o.id DESC LIMIT 1) AS used_order,
        (SELECT o.created_at FROM orders o WHERE o.coupon_code = c.code ORDER BY o.id DESC LIMIT 1) AS used_at,
        (SELECT o.customer_name FROM orders o WHERE o.public_id = c.issued_order LIMIT 1) AS issued_name,
        (SELECT o.customer_name FROM orders o WHERE o.coupon_code = c.code ORDER BY o.id DESC LIMIT 1) AS used_name
       FROM coupons c WHERE c.is_personal = 1 ORDER BY c.id DESC LIMIT 500`
    ).all();
    const rewards = [];
    for (const r of results || []) {
      rewards.push({
        ...r,
        issued_name: await decryptField(env, r.issued_name),
        used_name: await decryptField(env, r.used_name)
      });
    }
    return json({ rewards });
  }

  if (path === "/api/admin/security" && m === "GET") {
    const s = await authorize(request, env);
    const sess = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND expires_at > ?"
    ).bind(s.id, Date.now()).first();
    const fails = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM audit_log WHERE action = 'login_fail' AND created_at > datetime('now', '-24 hours')"
    ).first();
    const admins = await env.DB.prepare("SELECT COUNT(*) AS c FROM admin_users").first();
    // আগের লগইন (বর্তমান লগইনের ঠিক আগের সফল লগইন)
    const prev = await env.DB.prepare(
      "SELECT created_at FROM audit_log WHERE action = 'login_ok' AND actor = ? ORDER BY id DESC LIMIT 1 OFFSET 1"
    ).bind(s.username).first();
    return json({
      sessions: sess ? sess.c : 0,
      failed24h: fails ? fails.c : 0,
      admins: admins ? admins.c : 0,
      lastLogin: prev ? prev.created_at : null
    });
  }

  /* ---------- Admin: give way (next-order coupon) ---------- */

  if (path === "/api/admin/giveaway" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const cur = await getGiveaway(env.DB);
    const code = String(b.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
    if (code.length < 4) throw new HttpError(400, "কুপন কোড কমপক্ষে ৪ অক্ষরের হতে হবে (A-Z, 0-9)।");
    const percent = clampInt(b.percent, 1, 100, 0);
    if (percent < 1) throw new HttpError(400, "ছাড়ের শতাংশ ১ থেকে ১০০ এর মধ্যে দিন।");
    const days = clampInt(b.expiry_days, 0, 3650, 0);
    const exp = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const clash = await env.DB.prepare("SELECT is_personal FROM coupons WHERE code = ?").bind(code).first();
    if (clash && Number(clash.is_personal)) throw new HttpError(409, "এই কুপন কোডটি আগে থেকেই আছে।");
    if (clash) {
      await env.DB.prepare("UPDATE coupons SET percent = ?, expires_at = ?, active = 1 WHERE code = ? AND is_personal = 0")
        .bind(percent, exp, code).run();
    } else {
      await env.DB.prepare(
        "INSERT INTO coupons (code, percent, max_uses, expires_at, active, reward_rule, valid_days) VALUES (?, ?, 0, ?, 1, 'none', 30)"
      ).bind(code, percent, exp).run();
    }
    // on/off আলাদা বাটন দিয়ে হয়, তাই সেভ করলে আগের on/off অবস্থা বজায় থাকে
    const cfg = {
      enabled: cur.enabled,
      code,
      bn: String(b.bn ?? "").trim().slice(0, 300),
      en: String(b.en ?? "").trim().slice(0, 300)
    };
    await env.DB.prepare("INSERT OR REPLACE INTO settings (k, v) VALUES ('giveaway', ?)").bind(JSON.stringify(cfg)).run();
    await audit(env, s.username, "giveaway_save", code + " " + percent + "%", rawIp);
    return json({ success: true });
  }

  if (path === "/api/admin/giveaway/generate" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const percent = clampInt(b.percent, 1, 100, 0);
    if (percent < 1) throw new HttpError(400, "ছাড়ের শতাংশ ১ থেকে ১০০ এর মধ্যে দিন।");
    const days = clampInt(b.expiry_days, 0, 3650, 0);
    const exp = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
    let code = "";
    for (let i = 0; i < 5 && !code; i++) {
      const cand = "GIFT" + randomCode(5);
      const clash = await env.DB.prepare("SELECT id FROM coupons WHERE code = ?").bind(cand).first();
      if (!clash) code = cand;
    }
    if (!code) throw new HttpError(500, "কোড তৈরি করা যায়নি, আবার চেষ্টা করুন।");
    await env.DB.prepare(
      "INSERT INTO coupons (code, percent, max_uses, expires_at, active, reward_rule, valid_days) VALUES (?, ?, 0, ?, 1, 'none', 30)"
    ).bind(code, percent, exp).run();
    const cur = await getGiveaway(env.DB);
    await env.DB.prepare("INSERT OR REPLACE INTO settings (k, v) VALUES ('giveaway', ?)")
      .bind(JSON.stringify({ enabled: cur.enabled, code, bn: cur.bn, en: cur.en })).run();
    await audit(env, s.username, "giveaway_generate", code + " " + percent + "%", rawIp);
    return json({ success: true, code });
  }

  if (path === "/api/admin/giveaway/toggle" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const cur = await getGiveaway(env.DB);
    const enabled = !!b.enabled;
    if (enabled && !cur.exists) throw new HttpError(400, "আগে কুপন কোড সেভ করুন।");
    await env.DB.prepare("INSERT OR REPLACE INTO settings (k, v) VALUES ('giveaway', ?)")
      .bind(JSON.stringify({ enabled, code: cur.code, bn: cur.bn, en: cur.en })).run();
    await audit(env, s.username, "giveaway_toggle", enabled ? "on" : "off", rawIp);
    return json({ success: true, enabled });
  }

  /* ---------- Devices (Android push) ---------- */

  if (path === "/api/admin/devices" && m === "POST") {
    const s = await authorize(request, env);
    const b = await readJson(request);
    const token = String(b.token ?? "").trim();
    if (token.length < 20 || token.length > 4096) throw new HttpError(400, "Invalid token");
    await env.DB.prepare("INSERT OR REPLACE INTO devices (token, user_id) VALUES (?, ?)").bind(token, s.id).run();
    return json({ success: true });
  }

  if (path === "/api/admin/devices/remove" && m === "POST") {
    await authorize(request, env);
    const b = await readJson(request);
    await env.DB.prepare("DELETE FROM devices WHERE token = ?").bind(String(b.token ?? "")).run();
    return json({ success: true });
  }

  return fail(404, "Not found");
}

/* ============================================================
   Offer totals & print settings (Invoice / POS)
   ============================================================ */

/* ============================================================
   Give way: অর্ডার কনফার্মের পর ধন্যবাদ পাতায় দেখানো next-order কুপন
   ============================================================ */

async function getGiveaway(db) {
  const row = await db.prepare("SELECT v FROM settings WHERE k = 'giveaway'").first();
  let g = {};
  try { g = JSON.parse((row && row.v) || "{}"); } catch (e) { g = {}; }
  const code = String(g.code || "");
  const c = code
    ? await db.prepare(
        "SELECT percent, expires_at, active, max_uses, uses FROM coupons WHERE code = ? AND is_personal = 0"
      ).bind(code).first()
    : null;
  return {
    enabled: !!g.enabled,
    code,
    bn: String(g.bn || ""),
    en: String(g.en || ""),
    exists: !!c,
    percent: c ? Number(c.percent) : 0,
    expires_at: c ? c.expires_at : null,
    active: !!c && !!Number(c.active),
    max_uses: c ? Number(c.max_uses) : 0,
    uses: c ? Number(c.uses) : 0
  };
}

// গ্রাহককে শুধু তখনই দেখানো হবে যখন Give way চালু আছে এবং কুপন বৈধ
async function publicGiveaway(env) {
  const g = await getGiveaway(env.DB);
  if (!g.enabled || !g.code || !g.exists || !g.active) return null;
  if (g.expires_at && new Date(g.expires_at).getTime() <= Date.now()) return null;
  if (g.max_uses > 0 && g.uses >= g.max_uses) return null;
  const days = g.expires_at
    ? Math.max(1, Math.ceil((new Date(g.expires_at).getTime() - Date.now()) / 86400000))
    : 0;
  return { code: g.code, percent: g.percent, bn: g.bn, en: g.en, days };
}

async function offerTotals(db) {
  const r = await db.prepare(
    `SELECT COALESCE(SUM(coupon_discount), 0) AS coupon_total,
      COALESCE(SUM(bulk_discount), 0) AS bulk_total,
      COALESCE(SUM(CASE WHEN coupon_code IS NOT NULL AND coupon_code != '' THEN 1 ELSE 0 END), 0) AS coupon_orders
     FROM orders WHERE status != 'Cancelled'`
  ).first();
  return r || { coupon_total: 0, bulk_total: 0, coupon_orders: 0 };
}

const PRINT_KEYS = ["num", "customer", "phone", "address", "area", "product", "color", "size", "qty", "unit",
  "subtotal", "bulk", "coupon", "delivery", "status", "payment", "date", "contact"];
const PRINT_PAGES = ["A4", "A5", "Letter", "80mm", "58mm"];
const PRINT_LOGO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

function printDefaults(kind) {
  const pos = kind === "pos";
  const show = {};
  for (const k of PRINT_KEYS) show[k] = true;
  if (pos) { show.address = false; show.area = false; show.unit = false; }
  return {
    theme: pos ? "p_classic" : "emerald", brand: "NORALIBAS", tagline: "", contact: "",
    logo: "", logo_w: pos ? 48 : 64,
    primary: pos ? "#000000" : "#065f46", text: pos ? "#000000" : "#0f172a", bg: "#ffffff", line: pos ? "#000000" : "#cbd5e1",
    header_bg: !pos, line_on: true, font: pos ? "mono" : "sans", base: pos ? 12 : 14,
    page: pos ? "80mm" : "A4", margin: pos ? 3 : 12,
    footer_bn: "ধন্যবাদ আমাদের সাথে থাকার জন্য! ❤️", footer_en: "Thank you for shopping with us! ❤️",
    line_h: 150, align: "left", box_radius: 6, table_style: "grid", font_weight: 400,
    head_upper: false, compact: false, watermark: "", item_layout: pos ? "stacked" : "table",
    show
  };
}

// প্রিন্ট সেটিং সার্ভারে যাচাই করে সাফ করে (অবৈধ মান থাকলে ডিফল্ট বসে)
function cleanPrintCfg(kind, raw) {
  const d = printDefaults(kind);
  const r = raw && typeof raw === "object" ? raw : {};
  const str = (v, max, fb) => (typeof v === "string" ? v.trim().slice(0, max) : fb);
  const hex = (v, fb) => (typeof v === "string" && HEX_RE.test(v) ? v : fb);
  const bool = (v, fb) => (typeof v === "boolean" ? v : fb);
  const show = {};
  for (const k of PRINT_KEYS) {
    show[k] = r.show && typeof r.show === "object" ? !!r.show[k] : d.show[k];
  }
  const logo = typeof r.logo === "string" && r.logo.length <= 250 * 1024 && PRINT_LOGO_RE.test(r.logo) ? r.logo : "";
  return {
    theme: str(r.theme, 20, d.theme),
    brand: str(r.brand, 60, d.brand),
    tagline: str(r.tagline, 120, ""),
    contact: str(r.contact, 120, ""),
    logo,
    logo_w: clampInt(r.logo_w, 20, 220, d.logo_w),
    primary: hex(r.primary, d.primary),
    text: hex(r.text, d.text),
    bg: hex(r.bg, d.bg),
    line: hex(r.line, d.line),
    header_bg: bool(r.header_bg, d.header_bg),
    line_on: bool(r.line_on, d.line_on),
    font: Object.prototype.hasOwnProperty.call(NOTICE_FONT_CSS, r.font) ? r.font : d.font,
    base: clampInt(r.base, 8, 22, d.base),
    page: PRINT_PAGES.includes(r.page) ? r.page : d.page,
    margin: clampInt(r.margin, 0, 25, d.margin),
    footer_bn: str(r.footer_bn, 300, d.footer_bn),
    footer_en: str(r.footer_en, 300, d.footer_en),
    line_h: clampInt(r.line_h, 110, 220, d.line_h),
    align: NOTICE_ALIGN.includes(r.align) ? r.align : d.align,
    box_radius: clampInt(r.box_radius, 0, 16, d.box_radius),
    table_style: ["grid", "plain", "zebra"].includes(r.table_style) ? r.table_style : d.table_style,
    font_weight: [400, 600, 800].includes(Number(r.font_weight)) ? Number(r.font_weight) : d.font_weight,
    head_upper: bool(r.head_upper, d.head_upper),
    compact: bool(r.compact, d.compact),
    watermark: str(r.watermark, 30, d.watermark),
    item_layout: ["table", "stacked"].includes(r.item_layout) ? r.item_layout : d.item_layout,
    show
  };
}

function stockOutMessage(hasColor, hasSize, want, have, color, size) {
  const tag = [hasColor ? color : "", hasSize ? size : ""].filter(Boolean).join(" / ");
  const what = tag ? "“" + tag + "” এর" : "প্রোডাক্টের";
  if (have > 0) {
    return "🙏 দুঃখিত! " + what + " স্টক এখন মাত্র " + have + " টি আছে, আর আপনি " + want +
      " টি চাচ্ছেন। পরিমাণ বা বাছাই বদলে আবার চেষ্টা করুন।";
  }
  return "😔 দুঃখিত! " + what + " স্টক শেষ হয়ে গেছে। অন্য কালার বা সাইজ বেছে নিন, অথবা কিছুক্ষণ পর আবার দেখুন।";
}

/* ============================================================
   Notice block (ওয়েবসাইটে FAQ-এর উপরে)
   ============================================================ */

function noticeHtml(n) {
  const fam = NOTICE_FONT_CSS[n.font] || NOTICE_FONT_CSS.sans;
  const bg = n.bg ? "background:" + n.bg + ";" : "";
  let h = '<section class="notice" style="font-family:' + fam + ';text-align:' + n.align + ';' + bg + '">';
  if (n.image) h += '<img class="notice-img" src="' + escHtml(n.image) + '" alt="" loading="lazy">';
  if (n.head_bn || n.head_en) {
    h += '<h3 class="notice-h" style="font-size:' + n.head_size + 'px;color:' + n.head_color +
      ';font-weight:' + (n.bold ? 800 : 600) + '">' + biHtml(n.head_bn, n.head_en) + '</h3>';
  }
  if (n.body_bn || n.body_en) {
    h += '<div class="notice-b" style="font-size:' + n.body_size + 'px;color:' + n.body_color + '">' +
      biHtml(n.body_bn, n.body_en) + '</div>';
  }
  return h + '</section>';
}

/* ============================================================
   Landing Page (ওয়েবসাইট) — ডিফল্ট বাংলা
   ============================================================ */

function renderLandingHTML(p, inv, nonce, notes = {}) {
  const price = Number(p.price) || 0;
  const oldPrice = Number(p.old_price) || 0;
  const stock = Math.max(0, Number(p.stock) || 0);
  const isOut = stock <= 0;
  const delInside = Number(p.delivery_inside ?? 60);
  const delOutside = Number(p.delivery_outside ?? 120);
  const callPhone = escHtml(p.contact_phone || "01700000000");
  const waNumber = String(p.whatsapp_number || "8801700000000").replace(/[^0-9]/g, "");
  const waMsg = encodeURIComponent(
    `আসসালামু আলাইকুম, আমি "${p.title}" (মূল্য: ৳${price}) প্রোডাক্টটি সম্পর্কে জানতে চাচ্ছি।`
  );
  const title = escHtml(p.title);
  const L = (k) => escHtml(LANDING_STRINGS[k] ? LANDING_STRINGS[k][0] : k);
  const ratioCss = p.image_ratio.replace(":", " / ");
  const galleryAttr = p.image_ratio === "auto"
    ? 'class="gallery auto"'
    : 'class="gallery" style="aspect-ratio: ' + ratioCss + ';"';
  const mainImg = escHtml(p.images[0] || "");
  const colorList = splitList(p.colors);
  const sizeList = splitList(p.sizes);
  const dict = buildDictJson(LANDING_STRINGS);
  const colorsJson = JSON.stringify(colorList).replace(/</g, "\\u003c");
  const sizesJson = JSON.stringify(sizeList).replace(/</g, "\\u003c");

  const variantMap = {};
  (inv || []).forEach((r) => { variantMap[r.color + "|" + r.size] = Number(r.qty) || 0; });
  const variantsJson = JSON.stringify(variantMap).replace(/</g, "\\u003c");

  const tb = p.topbar;
  const tbSize = Number(tb.size) || 13;
  const tbPad = Number(tb.pad);
  const tbOffset = Number(tb.offset) || 0;
  const tbAlign = TOPBAR_ALIGN.includes(tb.align) ? tb.align : "center";
  const langSize = Number(tb.langSize) || 12;
  const langBtnHtml = tb.langShow
    ? '<button type="button" class="lang-btn" data-lang-toggle>EN</button>'
    : "";

  // Website notes: on/off toggle (ডিফল্ট চালু), লেখা থাকলেই দেখাবে
  const bulkNoteHtml = (notes.note_bulk_on !== "0" && (notes.note_bulk_bn || notes.note_bulk_en))
    ? biHtml(notes.note_bulk_bn, notes.note_bulk_en) : "";
  const couponNoteHtml = (notes.note_coupon_on !== "0" && (notes.note_coupon_bn || notes.note_coupon_en))
    ? biHtml(notes.note_coupon_bn, notes.note_coupon_en) : "";

  const trustHtml = p.trust.map((it) =>
    `<div><b>${escHtml(it.icon)}</b>${biHtml(it.bn, it.en)}</div>`
  ).join("");
  const faqHtml = p.faqs.map((f) =>
    `<details><summary>${biHtml(f.qbn, f.qen)}</summary><p>${biHtml(f.abn, f.aen)}</p></details>`
  ).join("");
  const noticesHtml = p.notices.filter((n) => n.on).map(noticeHtml).join("");

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="description" content="${title}">
  <title>${title}</title>
  <style>
    :root { --brand: #047857; --brand-2: #059669; --brand-soft: #ecfdf5; --brand-line: #a7f3d0; --brand-ink: #065f46; --accent: #dc2626; --ink: #0f172a; --muted: #64748b; --line: #e2e8f0; --bg: #f1f5f9; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Noto Sans Bengali', sans-serif; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); -webkit-font-smoothing: antialiased; }
    button, input, textarea, select { font: inherit; color: inherit; }
    .hidden { display: none !important; }
    html[lang="en"] .l-bn { display: none; }
    html[lang="bn"] .l-en { display: none; }
    .page { max-width: 520px; margin: 0 auto; background: #fff; min-height: 100vh; padding-bottom: 110px; box-shadow: 0 0 30px rgba(15,23,42,.06); }

    .topbar { background: linear-gradient(90deg, #064e3b, #0f766e); color: #fff; display: flex; align-items: center; justify-content: center; padding: ${tbPad}px 56px; position: sticky; top: 0; z-index: 50; }
    .tb-text { flex: 1; min-width: 0; text-align: ${tbAlign}; font-size: ${tbSize}px; font-weight: 700; line-height: 1.4; white-space: pre-line; word-break: break-word; transform: translateX(${tbOffset}px); }
    .lang-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.12); color: #fff; padding: 6px 11px; border-radius: 999px; font-size: ${langSize}px; font-weight: 800; cursor: pointer; letter-spacing: .5px; }

    .gallery { position: relative; background: #f8fafc; overflow: hidden; }
    .gallery img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .gallery.auto img { height: auto; max-height: 600px; object-fit: contain; }
    .off-badge { position: absolute; background: var(--accent); color: #fff; padding: 6px 12px; border-radius: 999px; font-size: 13px; font-weight: 800; box-shadow: 0 6px 16px rgba(220,38,38,.35); z-index: 2; }
    .pos-tl { top: 14px; left: 14px; }
    .pos-tr { top: 14px; right: 14px; }
    .pos-bl { bottom: 14px; left: 14px; }
    .pos-br { bottom: 14px; right: 14px; }
    .thumbs { display: flex; gap: 8px; padding: 12px 14px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--line); }
    .thumbs::-webkit-scrollbar { display: none; }
    .thumbs img { width: 60px; height: 60px; object-fit: cover; border-radius: 10px; border: 2px solid transparent; cursor: pointer; flex-shrink: 0; background: #fff; }
    .thumbs img.active { border-color: var(--brand); }

    .content { padding: 18px 16px 8px; }
    .title { font-size: 22px; font-weight: 800; line-height: 1.35; letter-spacing: -.2px; margin-bottom: 12px; }
    .price-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
    .price { font-size: 30px; font-weight: 900; color: var(--brand); letter-spacing: -.5px; }
    .old-price { font-size: 16px; color: #94a3b8; text-decoration: line-through; }
    .stock-tag { padding: 5px 10px; border-radius: 8px; font-size: 12.5px; font-weight: 800; background: ${isOut ? "#fee2e2" : "#dcfce7"}; color: ${isOut ? "#dc2626" : "#15803d"}; }

    .trust { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 8px; margin: 6px 0 16px; }
    .trust div { background: var(--brand-soft); border: 1px solid var(--brand-line); border-radius: 12px; padding: 10px 6px; text-align: center; font-size: 12px; font-weight: 700; color: var(--brand-ink); }
    .trust b { display: block; font-size: 18px; margin-bottom: 2px; }
    .trust .l-bn, .trust .l-en { display: block; }

    .card { border: 1px solid var(--line); border-radius: 14px; padding: 14px; margin-bottom: 12px; background: #fff; }
    .card h3 { font-size: 15px; margin-bottom: 8px; color: #1e293b; }
    .desc { font-size: 15px; line-height: 1.7; color: #475569; white-space: pre-line; }

    .notice { border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; background: #fff; }
    .notice-img { display: block; width: 100%; max-height: 260px; object-fit: contain; border-radius: 10px; margin-bottom: 10px; background: #f8fafc; }
    .notice-h { line-height: 1.35; margin-bottom: 6px; }
    .notice-b { line-height: 1.7; white-space: pre-line; }
    .notice .l-bn, .notice .l-en { display: inline; }

    details { border-bottom: 1px dashed var(--line); padding: 12px 0; }
    details:last-child { border-bottom: none; }
    summary { cursor: pointer; font-weight: 700; font-size: 15px; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    summary::-webkit-details-marker { display: none; }
    summary::after { content: "+"; font-size: 20px; color: var(--brand); font-weight: 800; }
    details[open] summary::after { content: "–"; }
    details p { margin-top: 8px; font-size: 14px; line-height: 1.6; color: #475569; }

    .contact-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 6px 0 12px; }
    .act-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 13px 10px; border-radius: 12px; font-size: 14px; font-weight: 800; text-decoration: none; color: #fff; }
    .call-btn { background: #0284c7; }
    .wa-btn { background: #16a34a; }

    .sticky-bar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 520px; background: rgba(255,255,255,.96); backdrop-filter: blur(8px); padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -8px 24px rgba(15,23,42,.08); border-top: 1px solid var(--line); z-index: 900; display: flex; align-items: center; gap: 12px; }
    .sticky-price { flex: 1; min-width: 0; }
    .sticky-price strong { display: block; font-size: 20px; color: var(--brand); font-weight: 900; }
    .sticky-price small { color: var(--muted); font-size: 12px; }
    .open-btn { flex: 1.2; padding: 15px; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 24px rgba(220,38,38,.3); }
    .open-btn:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; }

    .modal { position: fixed; inset: 0; background: rgba(15,23,42,.6); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
    @media (min-width: 640px) { .modal { align-items: center; } .modal-box { border-radius: 20px !important; } }
    .modal-box { background: #fff; width: 100%; max-width: 520px; max-height: 92vh; overflow-y: auto; border-radius: 22px 22px 0 0; padding: 20px 18px calc(22px + env(safe-area-inset-bottom, 0px)); position: relative; }
    .modal-close { position: absolute; top: 12px; right: 12px; border: none; background: #e2e8f0; width: 34px; height: 34px; border-radius: 50%; font-size: 15px; cursor: pointer; }
    .order-title { font-size: 18px; font-weight: 800; text-align: center; color: var(--brand); margin: 4px 0 16px; padding-right: 30px; }
    .field { margin-bottom: 14px; }
    .field label.lbl { display: block; font-size: 13.5px; font-weight: 700; margin-bottom: 6px; color: #334155; }
    .field input[type="text"], .field input[type="tel"], .field textarea { width: 100%; padding: 12px 14px; border: 1.5px solid #cbd5e1; border-radius: 12px; font-size: 15px; outline: none; background: #fff; }
    .field input:focus, .field textarea:focus { border-color: var(--brand-2); box-shadow: 0 0 0 4px rgba(5,150,105,.12); }
    .variant-group { display: flex; flex-wrap: wrap; gap: 8px; }
    .var-chip { border: 1.5px solid #cbd5e1; background: #f8fafc; padding: 9px 14px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .var-chip.active { border-color: var(--brand); background: var(--brand-soft); color: var(--brand-ink); }
    .var-chip input { accent-color: var(--brand); }
    .var-chip.oos { opacity: .45; text-decoration: line-through; cursor: not-allowed; }
    .delivery-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .del-card { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 11px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; background: #f8fafc; }
    .del-card.active { border-color: var(--brand); background: var(--brand-soft); color: var(--brand-ink); }
    .del-card input { accent-color: var(--brand); width: 16px; height: 16px; }
    .qty-box { display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--line); margin-bottom: 8px; }
    .qty-controls { display: flex; align-items: center; gap: 12px; }
    .qty-btn { width: 36px; height: 36px; border: none; background: var(--brand); color: #fff; font-size: 18px; font-weight: 800; border-radius: 10px; cursor: pointer; }
    .qty-val { font-size: 17px; font-weight: 800; min-width: 24px; text-align: center; }
    .summary { background: var(--brand-soft); padding: 12px 14px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--brand-line); }
    .sum-row { display: flex; justify-content: space-between; font-size: 14px; color: #334155; margin-bottom: 6px; font-weight: 600; }
    .sum-total { display: flex; justify-content: space-between; font-size: 17px; font-weight: 900; color: var(--brand-ink); border-top: 1px dashed var(--brand-line); padding-top: 8px; margin-top: 4px; }
    .submit-btn { width: 100%; padding: 15px; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border: none; border-radius: 14px; font-size: 17px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 24px rgba(220,38,38,.3); }
    .submit-btn:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; }
    .hint { font-size: 13px; color: #b45309; background: #fef3c7; padding: 9px 12px; border-radius: 10px; margin-top: 10px; text-align: center; font-weight: 700; }
    .lnotice { position: fixed; left: 50%; top: 18px; transform: translate(-50%, -16px); background: #7f1d1d; color: #fff; padding: 12px 18px; border-radius: 14px; font-weight: 700; font-size: 14px; line-height: 1.5; box-shadow: 0 14px 34px rgba(0,0,0,.25); opacity: 0; transition: opacity .25s, transform .25s; z-index: 3000; max-width: 92vw; width: max-content; text-align: center; }
    .lnotice.show { opacity: 1; transform: translate(-50%, 0); }

    .coupon-box { margin-bottom: 12px; }
    .coupon-box input { width: 100%; padding: 12px 14px; border: 1.5px dashed var(--brand-line); border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; outline: none; background: var(--brand-soft); margin-top: 6px; }
    .coupon-box input:focus { border-color: var(--brand-2); }
    .coupon-msg { font-size: 13px; font-weight: 700; margin-top: 6px; min-height: 16px; color: #64748b; }
    .coupon-msg.ok { color: #15803d; }
    .coupon-msg.err { color: #b91c1c; }
    .plain-note { font-size: 13px; font-weight: 700; line-height: 1.6; color: var(--brand-ink); text-align: center; white-space: pre-line; margin: 6px 2px 12px; }
    .plain-note.hidden { display: none !important; }
    .sum-row.good { color: #15803d; }
    .units-summary { font-size: 13px; font-weight: 800; color: var(--brand-ink); background: var(--brand-soft); border: 1px dashed var(--brand-line); border-radius: 10px; padding: 8px 12px; margin: 0 0 12px; }
    .same-row { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; margin-bottom: 12px; }
    .unit-row { display: grid; grid-template-columns: 90px 1fr; gap: 10px; align-items: center; border: 1px solid var(--line); border-radius: 12px; padding: 10px; margin-bottom: 10px; }
    .unit-no { font-weight: 800; font-size: 14px; color: #334155; }
    .unit-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .unit-sel { width: 100%; padding: 10px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #fff; }
    .unit-sel:disabled { background: #f1f5f9; color: #94a3b8; }

    /* Success — ফর্মের সাথে একই সবুজ রঙের থিম */
    .success-msg { text-align: center; padding: 24px 18px; background: var(--brand-soft); border: 1px solid var(--brand-line); border-radius: 18px; color: var(--brand-ink); }
    .ok-badge { width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 10px; background: linear-gradient(135deg, #34d399, var(--brand)); color: #fff; font-size: 30px; font-weight: 900; display: grid; place-items: center; box-shadow: 0 10px 24px rgba(4,120,87,.3); }
    .success-text { font-size: 15px; font-weight: 700; line-height: 1.8; white-space: pre-line; }
    .oid-row { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; margin: 14px 0 4px; font-size: 13px; }
    .oid-chip { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 800; background: #fff; border: 1.5px dashed var(--brand); padding: 5px 12px; border-radius: 8px; letter-spacing: .5px; color: var(--brand-ink); }
    .copy-btn { border: none; background: var(--brand); color: #fff; font-weight: 800; font-size: 12px; padding: 7px 12px; border-radius: 9px; cursor: pointer; white-space: nowrap; }
    .reward { margin-top: 16px; border: 1.5px dashed var(--brand-2); background: #fff; border-radius: 14px; padding: 14px; color: var(--brand-ink); }
    .reward-title { font-size: 15px; font-weight: 900; margin-bottom: 10px; }
    .reward-code { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
    .reward-code span { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 21px; font-weight: 900; letter-spacing: 2px; background: var(--brand-soft); padding: 8px 14px; border-radius: 10px; color: var(--brand-ink); }
    .reward-note { font-size: 12.5px; margin-top: 10px; line-height: 1.6; }
    .back-btn { margin-top: 16px; width: 100%; padding: 13px; border: none; border-radius: 14px; background: var(--brand); color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; }
  </style>
</head>
<body>
  <div class="page">
    <header class="topbar">
      <div class="tb-text">${biHtml(tb.bn, tb.en)}</div>
      ${langBtnHtml}
    </header>

    <div ${galleryAttr}>
      <img id="mainProductImg" src="${mainImg}" alt="${title}">
      ${oldPrice > price ? `<span class="off-badge pos-${p.badge_pos}"><span data-i18n="off">${L("off")}</span> ৳${oldPrice - price}</span>` : ""}
    </div>
    ${p.images.length > 1 ? `
    <div class="thumbs" id="thumbs">
      ${p.images.map((src, i) => `<img src="${escHtml(src)}" data-idx="${i}" class="${i === 0 ? "active" : ""}" alt="">`).join("")}
    </div>` : ""}

    <div class="content">
      <h1 class="title">${title}</h1>
      <div class="price-row">
        <span class="price">৳${price}</span>
        ${oldPrice > price ? `<span class="old-price">৳${oldPrice}</span>` : ""}
        <span class="stock-tag" data-i18n="${isOut ? "out_stock" : "in_stock"}">${L(isOut ? "out_stock" : "in_stock")}</span>
      </div>

      ${p.trust.length ? `<div class="trust">${trustHtml}</div>` : ""}

      <div class="contact-row">
        <a href="tel:${callPhone}" class="act-btn call-btn" data-i18n="call">${L("call")}</a>
        <a href="https://wa.me/${waNumber}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="act-btn wa-btn" data-i18n="wa">${L("wa")}</a>
      </div>

      <div class="card">
        <h3 data-i18n="about_title">${L("about_title")}</h3>
        <div class="desc">${escHtml(p.description)}</div>
      </div>

      ${noticesHtml}

      ${p.faqs.length ? `
      <div class="card">
        <h3 data-i18n="faq_title">${L("faq_title")}</h3>
        ${faqHtml}
      </div>` : ""}
    </div>
  </div>

  <div class="sticky-bar" id="stickyBar">
    <div class="sticky-price">
      <strong>৳${price}</strong>
      <small data-i18n="delivery_note">${L("delivery_note")}</small>
    </div>
    <button type="button" class="open-btn" id="openOrderBtn" data-i18n="buy_now" ${isOut ? "disabled" : ""}>${L("buy_now")}</button>
  </div>

  <div class="modal hidden" id="orderModal">
    <div class="modal-box">
      <button type="button" class="modal-close" id="closeModal" aria-label="close">✕</button>
      <div class="order-title" id="formTitle" data-i18n="form_title">${L("form_title")}</div>

      <form id="orderForm">
        <div class="field">
          <label class="lbl" for="name" data-i18n="l_name">${L("l_name")}</label>
          <input type="text" id="name" required maxlength="100" data-i18n-ph="ph_name" placeholder="${L("ph_name")}">
        </div>
        <div class="field">
          <label class="lbl" for="phone" data-i18n="l_phone">${L("l_phone")}</label>
          <input type="tel" id="phone" required placeholder="01XXXXXXXXX" pattern="01[3-9][0-9]{8}">
        </div>
        <div class="field">
          <label class="lbl" for="address" data-i18n="l_address">${L("l_address")}</label>
          <textarea id="address" rows="2" required maxlength="500" data-i18n-ph="ph_address" placeholder="${L("ph_address")}"></textarea>
        </div>

        ${colorList.length > 0 ? `
        <div class="field">
          <label class="lbl" data-i18n="l_color">${L("l_color")}</label>
          <div class="variant-group" id="colorGroup">
            ${colorList.map((c) => `<label class="var-chip"><input type="radio" name="color" value="${escHtml(c)}" required> ${escHtml(c)}</label>`).join("")}
          </div>
        </div>` : ""}

        ${sizeList.length > 0 ? `
        <div class="field">
          <label class="lbl" data-i18n="l_size">${L("l_size")}</label>
          <div class="variant-group" id="sizeGroup">
            ${sizeList.map((s) => `<label class="var-chip"><input type="radio" name="size" value="${escHtml(s)}" required> ${escHtml(s)}</label>`).join("")}
          </div>
        </div>` : ""}

        <div class="field">
          <label class="lbl" data-i18n="l_area">${L("l_area")}</label>
          <div class="delivery-options">
            <label class="del-card" id="cardInside">
              <input type="radio" name="area" id="radioInside" value="inside">
              <div><span data-i18n="area_in">${L("area_in")}</span><br><span style="color:var(--brand);">৳${delInside}</span></div>
            </label>
            <label class="del-card" id="cardOutside">
              <input type="radio" name="area" id="radioOutside" value="outside">
              <div><span data-i18n="area_out">${L("area_out")}</span><br><span style="color:var(--brand);">৳${delOutside}</span></div>
            </label>
          </div>
        </div>

        <div class="qty-box">
          <span style="font-weight:700; font-size:14px;" data-i18n="l_qty">${L("l_qty")}</span>
          <div class="qty-controls">
            <button type="button" class="qty-btn" id="qtyMinus">-</button>
            <span class="qty-val" id="qtyDisplay">1</span>
            <button type="button" class="qty-btn" id="qtyPlus">+</button>
          </div>
        </div>
        <div class="plain-note${bulkNoteHtml ? "" : " hidden"}" id="bulkNote" data-custom="${bulkNoteHtml ? "1" : "0"}">${bulkNoteHtml}</div>

        <div class="units-summary hidden" id="unitsSummary"></div>

        <div class="coupon-box">
          <label class="lbl" for="coupon" data-i18n="coupon_label">${L("coupon_label")}</label>
          <input type="text" id="coupon" maxlength="40" autocomplete="off" autocapitalize="characters" data-i18n-ph="coupon_ph" placeholder="${L("coupon_ph")}">
          <div class="coupon-msg" id="couponMsg"></div>
        </div>
        <div class="plain-note${couponNoteHtml ? "" : " hidden"}" id="couponNote">${couponNoteHtml}</div>

        <div class="summary">
          <div class="sum-row"><span data-i18n="l_subtotal">${L("l_subtotal")}</span><span id="subTotal">৳${price}</span></div>
          <div class="sum-row good hidden" id="bulkRow"><span id="bulkLabel"></span><span id="bulkAmt"></span></div>
          <div class="sum-row good hidden" id="couponRow"><span id="couponLabel"></span><span id="couponAmt"></span></div>
          <div class="sum-row"><span data-i18n="l_delivery">${L("l_delivery")}</span><span id="delChargeDisplay" data-i18n="select_first">${L("select_first")}</span></div>
          <div class="sum-total"><span data-i18n="l_total">${L("l_total")}</span><span id="totalPrice">৳${price} <span data-i18n="plus_delivery">${L("plus_delivery")}</span></span></div>
        </div>

        <button type="submit" class="submit-btn" id="submitBtn" disabled data-i18n="submit">${L("submit")}</button>
        <div class="hint" id="formHint" data-i18n="hint">${L("hint")}</div>
      </form>

      <div class="success-msg hidden" id="successMsg">
        <div class="ok-badge">✓</div>
        <div class="success-text" id="successText"></div>
        <div class="oid-row"><span class="lbl" data-i18n="oid_label">${L("oid_label")}</span><span class="oid-chip" id="oidChip"></span><button type="button" class="copy-btn" id="copyOid" data-i18n="copy_btn">${L("copy_btn")}</button></div>
        <div class="reward hidden" id="rewardBox">
          <div class="reward-title" data-i18n="reward_title">${L("reward_title")}</div>
          <div class="reward-code"><span id="rewardCode"></span><button type="button" class="copy-btn" id="copyReward" data-i18n="copy_btn">${L("copy_btn")}</button></div>
          <div class="reward-note" id="rewardNote"></div>
        </div>
        <div class="reward hidden" id="giveBox">
          <div class="reward-title" data-i18n="give_title">${L("give_title")}</div>
          <div class="reward-code"><span id="giveCode"></span><button type="button" class="copy-btn" id="copyGive" data-i18n="copy_btn">${L("copy_btn")}</button></div>
          <div class="reward-note" id="giveNote" style="white-space:pre-line;"></div>
        </div>
        <button type="button" class="back-btn" id="backToProduct" data-i18n="back_product">${L("back_product")}</button>
      </div>
    </div>
  </div>

  <div class="modal hidden" id="unitsModal" style="z-index:1100">
    <div class="modal-box units-box">
      <button type="button" class="modal-close" id="unitsClose" aria-label="close">✕</button>
      <div class="order-title" data-i18n="unit_title">${L("unit_title")}</div>
      <label class="same-row"><input type="checkbox" id="unitsSame"> <span data-i18n="unit_same">${L("unit_same")}</span></label>
      <div id="unitsRows"></div>
      <button type="button" class="submit-btn" id="unitsOk" data-i18n="unit_ok">${L("unit_ok")}</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const DICT = ${dict};
    // ওয়েবসাইট ডিফল্টে বাংলা; আলাদা storage key যাতে অ্যাডমিনের ভাষার সাথে না মেশে
    let LANG = 'bn';
    try { if (localStorage.getItem('site_lang') === 'en') LANG = 'en'; } catch (e) {}

    const T = (key, vars) => {
      let s = (DICT[LANG] && DICT[LANG][key]) || DICT.bn[key] || key;
      if (vars) Object.keys(vars).forEach((k) => { s = s.split('{' + k + '}').join(vars[k]); });
      return s;
    };

    const unitPrice = ${price};
    const maxStock = ${stock};
    const chargeInside = ${delInside};
    const chargeOutside = ${delOutside};
    let qty = 1;
    let selectedArea = null;

    const $ = (id) => document.getElementById(id);

    function notify(msg) {
      const el = document.createElement('div');
      el.className = 'lnotice';
      el.textContent = msg;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3400);
    }
    const form = $('orderForm');
    const submitBtn = $('submitBtn');

    function applyLang() {
      document.documentElement.lang = LANG;
      document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T(el.getAttribute('data-i18n')); });
      document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = T(el.getAttribute('data-i18n-ph')); });
      document.querySelectorAll('[data-lang-toggle]').forEach((el) => { el.textContent = LANG === 'bn' ? 'EN' : 'বাং'; });
      renderSuccess();
      updateSummary();
      refreshSubmit();
    }

    const thumbs = $('thumbs');
    if (thumbs) {
      thumbs.querySelectorAll('img').forEach((img) => {
        img.addEventListener('click', () => {
          $('mainProductImg').src = img.src;
          thumbs.querySelectorAll('img').forEach((i) => i.classList.remove('active'));
          img.classList.add('active');
        });
      });
    }

    const VARIANTS = ${variantsJson};
    const HAS_COLORS = ${colorList.length > 0};
    const HAS_SIZES = ${sizeList.length > 0};

    function vqty(c, s) {
      const k = c + '|' + s;
      return Object.prototype.hasOwnProperty.call(VARIANTS, k) ? VARIANTS[k] : null;
    }
    function pickedColor() { const e = document.querySelector('input[name="color"]:checked'); return e ? e.value : ''; }
    function pickedSize() { const e = document.querySelector('input[name="size"]:checked'); return e ? e.value : ''; }

    function capQty() {
      const c = HAS_COLORS ? pickedColor() : '';
      const s = HAS_SIZES ? pickedSize() : '';
      if ((HAS_COLORS && !c) || (HAS_SIZES && !s)) return maxStock;
      const q = vqty(c, s);
      return q === null ? maxStock : Math.max(0, Math.min(maxStock, q));
    }

    function applyVariantRules() {
      const c = pickedColor();
      const s = pickedSize();
      if (HAS_SIZES) {
        document.querySelectorAll('input[name="size"]').forEach((inp) => {
          const q = vqty(HAS_COLORS ? c : '', inp.value);
          const out = q !== null && q <= 0;
          inp.disabled = out;
          inp.closest('.var-chip').classList.toggle('oos', out);
          if (out && inp.checked) inp.checked = false;
        });
      }
      if (HAS_COLORS) {
        document.querySelectorAll('input[name="color"]').forEach((inp) => {
          const q = vqty(inp.value, HAS_SIZES ? s : '');
          const out = q !== null && q <= 0;
          inp.disabled = out;
          inp.closest('.var-chip').classList.toggle('oos', out);
          if (out && inp.checked) inp.checked = false;
        });
      }
      document.querySelectorAll('.variant-group .var-chip').forEach((chip) => {
        chip.classList.toggle('active', chip.querySelector('input').checked);
      });
      const cap = capQty();
      if (qty > Math.max(1, cap)) qty = Math.max(1, cap);
      syncUnits();
      updateSummary();
      refreshSubmit();
    }

    document.querySelectorAll('.variant-group').forEach((group) => {
      group.addEventListener('change', applyVariantRules);
    });

    let orderLastId = '';
    let lastReward = null;
    let lastGive = null;

    function isModalOpen() {
      return !$('orderModal').classList.contains('hidden');
    }

    // অর্ডার শেষ হলে বা popup বন্ধ হলে ফর্ম সম্পূর্ণ খালি হয়ে পণ্যের পাতায় ফিরবে
    function resetSuccessUI() {
      orderLastId = '';
      form.reset();
      form.classList.remove('hidden');
      $('formTitle').classList.remove('hidden');
      $('successMsg').classList.add('hidden');
      lastReward = null;
      lastGive = null;
      $('rewardBox').classList.add('hidden');
      $('giveBox').classList.add('hidden');
      selectedArea = null;
      qty = 1;
      sameMode = false;
      units = [];
      $('cardInside').classList.remove('active');
      $('cardOutside').classList.remove('active');
      document.querySelectorAll('.var-chip').forEach((c) => c.classList.remove('active'));
      document.querySelectorAll('.var-chip input').forEach((i) => { i.checked = false; i.disabled = false; });
      document.querySelectorAll('.var-chip.oos').forEach((c) => c.classList.remove('oos'));
      submitBtn.textContent = T('submit');
      updateSummary();
      applyVariantRules();
    }

    function pickLang(bn, en) { return LANG === 'bn' ? (bn || en) : (en || bn); }

    function renderSuccess() {
      if (!orderLastId) return;
      $('successText').textContent = T('success');
      $('oidChip').textContent = orderLastId;
      if (lastReward) {
        $('rewardCode').textContent = lastReward.code;
        $('rewardNote').textContent = T('reward_note', { p: lastReward.percent, d: lastReward.days });
        $('rewardBox').classList.remove('hidden');
      } else {
        $('rewardBox').classList.add('hidden');
      }
      if (lastGive) {
        var msg = pickLang(lastGive.bn, lastGive.en) || T('give_note', { p: lastGive.percent });
        if (lastGive.days > 0) msg += '\\n' + T('give_exp', { d: lastGive.days });
        $('giveCode').textContent = lastGive.code;
        $('giveNote').textContent = msg;
        $('giveBox').classList.remove('hidden');
      } else {
        $('giveBox').classList.add('hidden');
      }
    }

    function openModal() {
      $('orderModal').classList.remove('hidden');
      $('stickyBar').classList.add('hidden');
      if (!(history.state && history.state.orderModal)) history.pushState({ orderModal: true }, '');
      setTimeout(() => { if ($('successMsg').classList.contains('hidden')) $('name').focus(); }, 200);
    }

    function hideModalUI() {
      $('orderModal').classList.add('hidden');
      $('stickyBar').classList.remove('hidden');
      if (!$('successMsg').classList.contains('hidden')) resetSuccessUI();
    }

    function closeModal() {
      if (!isModalOpen()) return;
      hideModalUI();
      if (history.state && history.state.orderModal) history.back();
    }

    window.addEventListener('popstate', () => {
      if (isModalOpen()) hideModalUI();
    });

    $('openOrderBtn').addEventListener('click', openModal);
    $('closeModal').addEventListener('click', closeModal);
    $('backToProduct').addEventListener('click', closeModal);
    $('orderModal').addEventListener('click', (e) => {
      if (e.target.id === 'orderModal') closeModal();
    });

    let lastQuote = null;
    let quoteTimer = null;
    let quoteSeq = 0;

    function scheduleQuote() {
      clearTimeout(quoteTimer);
      quoteTimer = setTimeout(refreshQuote, 220);
    }

    async function refreshQuote() {
      const seq = ++quoteSeq;
      try {
        const res = await fetch('/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: qty,
            area: selectedArea || '',
            coupon: $('coupon').value.trim(),
            phone: $('phone').value.replace(/\\D/g, '')
          })
        });
        const data = await res.json().catch(() => null);
        if (seq !== quoteSeq || !res.ok || !data) return;
        lastQuote = data;
        renderQuote(data);
      } catch (e) { /* নেটওয়ার্ক সমস্যা হলে আগের হিসাব থাকবে */ }
    }

    function renderQuote(d) {
      $('qtyDisplay').textContent = qty;
      $('subTotal').textContent = '৳' + d.subtotal;

      $('bulkRow').classList.toggle('hidden', !d.bulk);
      if (d.bulk) {
        $('bulkLabel').textContent = T('bulk_row', { n: d.bulkInfo.min });
        $('bulkAmt').textContent = '-৳' + d.bulk;
      }
      $('couponRow').classList.toggle('hidden', !d.coupon);
      if (d.coupon) {
        $('couponLabel').textContent = T('coupon_row', { p: d.coupon.percent });
        $('couponAmt').textContent = '-৳' + d.coupon.amount;
      }

      const msg = $('couponMsg');
      if (d.couponError) { msg.textContent = '⚠️ ' + d.couponError; msg.className = 'coupon-msg err'; }
      else if (d.coupon) { msg.textContent = '✅ ' + T('coupon_ok', { p: d.coupon.percent }); msg.className = 'coupon-msg ok'; }
      else if (d.couponPending) { msg.textContent = 'ℹ️ ' + T('coupon_pending'); msg.className = 'coupon-msg'; }
      else { msg.textContent = ''; msg.className = 'coupon-msg'; }

      if (!selectedArea) {
        $('delChargeDisplay').textContent = T('select_first');
        $('totalPrice').textContent = '৳' + d.total + ' ' + T('plus_delivery');
      } else {
        $('delChargeDisplay').textContent = '৳' + d.delivery;
        $('totalPrice').textContent = '৳' + d.total;
      }

      const bn = $('bulkNote');
      if (bn.dataset.custom === '1') { bn.classList.remove('hidden'); } else
      if (d.bulkInfo && d.bulkInfo.enabled) {
        const v = d.bulkInfo.type === 'fixed' ? '৳' + d.bulkInfo.value : d.bulkInfo.value + '%';
        bn.textContent = T('bulk_hint', { n: d.bulkInfo.min, v: v });
        bn.classList.remove('hidden');
      } else {
        bn.classList.add('hidden');
      }
    }

    function updateSummary() {
      if (lastQuote) renderQuote(lastQuote);
      else {
        $('qtyDisplay').textContent = qty;
        $('subTotal').textContent = '৳' + (qty * unitPrice);
      }
      scheduleQuote();
    }

    async function copyCode(text, btn) {
      const done = () => {
        btn.textContent = T('copied_btn');
        setTimeout(() => { btn.textContent = T('copy_btn'); }, 1600);
      };
      try {
        await navigator.clipboard.writeText(text);
        done();
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (err) { notify(text); }
        ta.remove();
      }
    }

    $('copyReward').addEventListener('click', () => copyCode($('rewardCode').textContent, $('copyReward')));
    $('copyGive').addEventListener('click', () => copyCode($('giveCode').textContent, $('copyGive')));
    $('copyOid').addEventListener('click', () => copyCode(orderLastId, $('copyOid')));
    $('coupon').addEventListener('input', scheduleQuote);

    function selectArea(area) {
      selectedArea = area;
      $('radioInside').checked = area === 'inside';
      $('radioOutside').checked = area === 'outside';
      $('cardInside').classList.toggle('active', area === 'inside');
      $('cardOutside').classList.toggle('active', area === 'outside');
      updateSummary();
      refreshSubmit();
    }

    $('radioInside').addEventListener('change', () => selectArea('inside'));
    $('radioOutside').addEventListener('change', () => selectArea('outside'));
    $('qtyMinus').addEventListener('click', () => changeQty(-1));
    $('qtyPlus').addEventListener('click', () => changeQty(1));

    // প্রতিটি পিসের কালার/সাইজ — ডিফল্টে "বাকি সব পিস প্রথমটির মতো" আনচেক থাকবে
    let units = [];
    let sameMode = false;
    const COLOR_LIST = ${colorsJson};
    const SIZE_LIST = ${sizesJson};

    function pickedMain() { return { color: pickedColor(), size: pickedSize() }; }

    function unitLabel(u) {
      return [HAS_COLORS ? u.color : '', HAS_SIZES ? u.size : ''].filter(Boolean).join(' / ');
    }

    function renderUnitsSummary() {
      const el = $('unitsSummary');
      if (qty < 2 || (!HAS_COLORS && !HAS_SIZES)) { el.classList.add('hidden'); return; }
      const count = {};
      units.forEach((u) => { const k = unitLabel(u); count[k] = (count[k] || 0) + 1; });
      el.textContent = T('units_label') + ': ' + Object.keys(count).map((k) => k + ' × ' + count[k]).join(', ');
      el.classList.remove('hidden');
    }

    function syncUnits() {
      const base = pickedMain();
      if (!units.length) units = [base];
      units[0] = base;
      while (units.length < qty) units.push(Object.assign({}, base));
      if (units.length > qty) units = units.slice(0, qty);
      if (sameMode) units = units.map(() => Object.assign({}, base));
      renderUnitsSummary();
    }

    function escJs(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function optionsFor(list, sel, keyOf) {
      return list.map((v) => {
        const k = keyOf(v);
        const q = vqty(k.c, k.s);
        const dis = q !== null && q <= 0 ? ' disabled' : '';
        return '<option value="' + escJs(v) + '"' + (v === sel ? ' selected' : '') + dis + '>' + escJs(v) + '</option>';
      }).join('');
    }

    function renderUnitsModal() {
      $('unitsSame').checked = sameMode;
      let html = '';
      for (let i = 1; i < qty; i++) {
        const u = units[i] || pickedMain();
        html += '<div class="unit-row"><div class="unit-no">' + escJs(T('unit_item', { n: i + 1 })) + '</div><div class="unit-pick">';
        if (HAS_COLORS) {
          html += '<select class="unit-sel" data-unit="' + i + '" data-field="color"' + (sameMode ? ' disabled' : '') + '>' +
            optionsFor(COLOR_LIST, u.color, (v) => ({ c: v, s: HAS_SIZES ? u.size : '' })) + '</select>';
        }
        if (HAS_SIZES) {
          html += '<select class="unit-sel" data-unit="' + i + '" data-field="size"' + (sameMode ? ' disabled' : '') + '>' +
            optionsFor(SIZE_LIST, u.size, (v) => ({ c: HAS_COLORS ? u.color : '', s: v })) + '</select>';
        }
        html += '</div></div>';
      }
      $('unitsRows').innerHTML = html;
    }

    function openUnitsModal() {
      syncUnits();
      renderUnitsModal();
      $('unitsModal').classList.remove('hidden');
    }

    function closeUnitsModal() {
      $('unitsModal').classList.add('hidden');
      renderUnitsSummary();
    }

    function changeQty(delta) {
      if (maxStock <= 0) return;
      const next = Math.max(1, Math.min(capQty(), qty + delta));
      const increased = next > qty;
      qty = next;
      syncUnits();
      updateSummary();
      refreshSubmit();
      if (increased && qty > 1 && (HAS_COLORS || HAS_SIZES)) openUnitsModal();
    }

    $('unitsSame').addEventListener('change', () => {
      sameMode = $('unitsSame').checked;
      syncUnits();
      renderUnitsModal();
      refreshSubmit();
    });
    $('unitsRows').addEventListener('change', (e) => {
      const sel = e.target;
      const i = Number(sel.getAttribute('data-unit'));
      if (!units[i]) return;
      units[i][sel.getAttribute('data-field')] = sel.value;
      renderUnitsSummary();
      refreshSubmit();
    });
    $('unitsOk').addEventListener('click', closeUnitsModal);
    $('unitsClose').addEventListener('click', closeUnitsModal);

    function isFormValid() {
      if (maxStock <= 0 || capQty() < 1) return false;
      const name = $('name').value.trim();
      const phone = $('phone').value.replace(/[\\s-]/g, '');
      const address = $('address').value.trim();
      if (name.length < 2) return false;
      if (!/^01[3-9][0-9]{8}$/.test(phone)) return false;
      if (address.length < 5) return false;
      if ($('colorGroup') && !document.querySelector('input[name="color"]:checked')) return false;
      if ($('sizeGroup') && !document.querySelector('input[name="size"]:checked')) return false;
      if (!selectedArea) return false;
      if (units.length !== qty) return false;
      for (const u of units) {
        if (HAS_COLORS && !u.color) return false;
        if (HAS_SIZES && !u.size) return false;
      }
      return true;
    }

    function refreshSubmit() {
      const ok = isFormValid();
      submitBtn.disabled = !ok;
      $('formHint').classList.toggle('hidden', ok);
    }

    form.addEventListener('input', refreshSubmit);
    form.addEventListener('input', scheduleQuote);
    form.addEventListener('change', refreshSubmit);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!isFormValid()) { refreshSubmit(); return; }

      const colorEl = document.querySelector('input[name="color"]:checked');
      const sizeEl = document.querySelector('input[name="size"]:checked');

      const payload = {
        name: $('name').value.trim(),
        phone: $('phone').value.trim(),
        address: $('address').value.trim(),
        color: colorEl ? colorEl.value : '',
        size: sizeEl ? sizeEl.value : '',
        area: selectedArea,
        quantity: qty,
        coupon: $('coupon').value.trim(),
        items: units.map((u) => ({ color: u.color || '', size: u.size || '' }))
      };

      submitBtn.disabled = true;
      submitBtn.textContent = T('submitting');

      try {
        const res = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          form.classList.add('hidden');
          $('formTitle').classList.add('hidden');
          orderLastId = data.orderId || '';
          lastReward = data.reward || null;
          lastGive = data.giveaway || null;
          renderSuccess();
          $('successMsg').classList.remove('hidden');
          return;
        }
        notify(data.error || T('net_error'));
      } catch (err) {
        notify(T('net_error'));
      }
      submitBtn.textContent = T('submit');
      refreshSubmit();
    });

    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        LANG = LANG === 'bn' ? 'en' : 'bn';
        try { localStorage.setItem('site_lang', LANG); } catch (e) {}
        applyLang();
      });
    });

    applyLang();
    applyVariantRules();
    refreshQuote();
  </script>
</body>
</html>`;
}

/* ============================================================
   Inactive (প্রোডাক্ট বন্ধ) page
   ============================================================ */

function renderInactiveHTML() {
  return `<!DOCTYPE html><html lang="bn"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Noralibas</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:'Segoe UI',Roboto,'Noto Sans Bengali',sans-serif;background:#f1f5f9;color:#0f172a;padding:20px;text-align:center}.box{background:#fff;padding:28px 22px;border-radius:18px;max-width:380px;box-shadow:0 10px 30px rgba(0,0,0,.06)}h1{font-size:20px;margin-bottom:10px}p{color:#475569;line-height:1.7;font-size:15px}</style></head><body><div class="box"><h1>এই মুহূর্তে প্রোডাক্টটি পাওয়া যাচ্ছে না</h1><p>শীঘ্রই আবার চালু হবে।<br>Currently unavailable. Please check back soon.</p></div></body></html>`;
}

/* ============================================================
   Admin Page
   এই HTML-এর script-এ backtick নেই (server interpolation ছাড়া)।
   inline onclick নেই, সব event delegation দিয়ে (CSP nonce-সহ নিরাপদ)।
   ============================================================ */

function renderAdminHTML(nonce) {
  const adminDict = buildDictJson(ADMIN_STRINGS);
  const tbDefaults = JSON.stringify({
    bn: LANDING_STRINGS.topbar[0],
    en: LANDING_STRINGS.topbar[1]
  }).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#065f46">
  <title>Admin Panel</title>
  <style>
    :root {
      --bg: #f3f6fb; --card: #ffffff; --text: #0f172a; --muted: #64748b; --line: #e2e8f0;
      --brand: #047857; --brand-2: #059669; --danger: #dc2626;
      --shadow: 0 8px 24px rgba(15,23,42,.07); --r: 16px; --input: #ffffff; --chip: #f1f5f9;
    }
    :root[data-theme="dark"] {
      --bg: #0b1220; --card: #121b2e; --text: #e2e8f0; --muted: #94a3b8; --line: #1f2b45;
      --shadow: none; --input: #0e1729; --chip: #1a2540;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Noto Sans Bengali', sans-serif; }
    html, body { overscroll-behavior-y: contain; }
    body { background: var(--bg); color: var(--text); font-size: 15px; -webkit-font-smoothing: antialiased; min-height: 100vh; }
    button, select, input, textarea { font: inherit; color: inherit; }
    .hidden { display: none !important; }
    .muted { color: var(--muted); font-size: 13px; }
    .empty { text-align: center; padding: 34px 10px; color: var(--muted); }

    /* ---- Login ---- */
    .login-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: radial-gradient(1200px 600px at 10% -10%, #10b981 0%, transparent 60%), radial-gradient(900px 500px at 110% 110%, #0ea5e9 0%, transparent 55%), #0b1220; position: relative; }
    .login-card { width: 100%; max-width: 380px; background: #ffffff; color: #0f172a; border-radius: 22px; padding: 28px 24px; box-shadow: 0 30px 80px rgba(0,0,0,.35); }
    .login-card .input { color: #0f172a; }
    .login-logo { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; font-size: 26px; background: linear-gradient(135deg, #059669, #0ea5e9); margin: 0 auto 14px; }
    .login-card h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
    .login-card .sub { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 20px; }
    .login-error { color: #b91c1c; font-weight: 700; font-size: 13px; min-height: 18px; margin-top: 10px; text-align: center; }
    .login-lang { position: absolute; top: 16px; right: 16px; }

    /* ---- Shell ---- */
    .topbar { position: sticky; top: 0; z-index: 50; background: linear-gradient(120deg, #064e3b, #0f766e); color: #fff; padding: calc(env(safe-area-inset-top, 0px) + 10px) 12px 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px; box-shadow: 0 6px 20px rgba(2,44,34,.25); }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; min-width: 0; }
    .brand .dot { flex-shrink: 0; width: 34px; height: 34px; border-radius: 11px; background: rgba(255,255,255,.18); display: grid; place-items: center; font-size: 17px; }
    .brand .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .top-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: #fff; color: #065f46; font-weight: 800; display: grid; place-items: center; font-size: 14px; }
    .icon-btn { flex-shrink: 0; min-width: 34px; height: 34px; padding: 0 9px; border-radius: 10px; border: none; background: rgba(255,255,255,.16); color: #fff; cursor: pointer; font-size: 13px; font-weight: 800; display: grid; place-items: center; }
    .icon-btn:hover { background: rgba(255,255,255,.26); }
    .icon-btn svg { width: 17px; height: 17px; display: block; }
    @media (max-width: 420px) { .brand .name { display: none; } }

    .nav { position: sticky; top: 0; z-index: 40; background: var(--card); border-bottom: 1px solid var(--line); overflow-x: auto; scrollbar-width: none; }
    .nav::-webkit-scrollbar { display: none; }
    .nav-inner { display: flex; gap: 6px; padding: 10px 12px; max-width: 1100px; margin: 0 auto; }
    .nav-btn { flex-shrink: 0; border: none; background: transparent; color: var(--muted); padding: 9px 14px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 14px; }
    .nav-btn:hover { background: var(--chip); color: var(--text); }
    .nav-btn.active { background: var(--brand); color: #fff; box-shadow: 0 6px 16px rgba(4,120,87,.3); }
    main { max-width: 1100px; margin: 0 auto; padding: 16px; min-height: 70vh; }
    .view-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
    .view-head h2 { font-size: 22px; letter-spacing: -.2px; }
    .view-head p { color: var(--muted); font-size: 13px; margin-top: 2px; }
    .ptr { position: fixed; top: 64px; left: 50%; transform: translateX(-50%); background: var(--card); color: var(--text); border: 1px solid var(--line); padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; box-shadow: var(--shadow); z-index: 60; opacity: 0; transition: opacity .2s; pointer-events: none; }
    .ptr.show { opacity: 1; }

    /* ---- Cards & forms ---- */
    .card { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 18px; box-shadow: var(--shadow); margin-bottom: 16px; }
    .card h3 { font-size: 16px; margin-bottom: 12px; }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .card-head h3 { margin: 0; }
    .grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .grid-4 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid-fields { display: grid; grid-template-columns: 1fr; gap: 12px; }
    @media (min-width: 760px) {
      .grid-2 { grid-template-columns: 1fr 1fr; }
      .grid-3 { grid-template-columns: repeat(3, 1fr); }
      .grid-4 { grid-template-columns: repeat(4, 1fr); }
      .grid-fields { grid-template-columns: 1fr 1fr; }
    }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .field label, .lbl { font-size: 13px; font-weight: 700; color: var(--muted); }
    .input { width: 100%; padding: 11px 13px; border: 1px solid var(--line); border-radius: 12px; background: var(--input); font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s; }
    .input:focus { border-color: var(--brand-2); box-shadow: 0 0 0 4px rgba(5,150,105,.15); }
    .input.emoji { width: 72px; text-align: center; flex-shrink: 0; }
    input[type="color"].input { padding: 4px; height: 42px; cursor: pointer; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .ed-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    .ed-row .input { min-width: 0; }
    .ed-row .grow { flex: 1; min-width: 0; }
    .ed-faq { border: 1px dashed var(--line); border-radius: 14px; padding: 12px; margin-bottom: 10px; }
    .ed-faq .grid-2 { gap: 10px; }
    .ed-faq .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; font-weight: 800; color: var(--muted); }
    .nt-prev { margin-top: 10px; border: 1px dashed var(--line); border-radius: 12px; padding: 4px; background: var(--chip); }
    .nt-prev .notice { border: none; background: transparent; padding: 10px; }
    .nt-prev .notice-img { display: block; width: 100%; max-height: 180px; object-fit: contain; border-radius: 10px; margin-bottom: 8px; }
    .nt-prev .notice-h { margin-bottom: 4px; }
    .nt-prev .notice-b { white-space: pre-line; }
    .nt-img-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .nt-img-row .input { flex: 1; min-width: 160px; }

    /* ---- Buttons ---- */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 11px 16px; border-radius: 12px; border: 1px solid transparent; background: var(--brand); color: #fff; font-weight: 700; cursor: pointer; font-size: 14px; text-decoration: none; transition: transform .05s, opacity .15s; white-space: nowrap; }
    .btn:hover { opacity: .92; }
    .btn:active { transform: translateY(1px); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn.block { width: 100%; }
    .btn.sm { padding: 7px 12px; font-size: 13px; border-radius: 10px; }
    .btn.ghost { background: var(--chip); color: var(--text); border-color: var(--line); }
    .btn.danger { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
    .btn.danger-solid { background: #dc2626; color: #fff; }
    .btn.wa { background: #16a34a; }
    .btn.call { background: #0284c7; }
    .btn.full-login { width: 100%; padding: 13px; font-size: 15px; }
    .actions4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 12px 0; }
    .actions4 .btn { padding: 9px 4px; font-size: 12px; border-radius: 10px; overflow: hidden; text-overflow: ellipsis; }

    /* ---- Password field with eye ---- */
    .pw { position: relative; }
    .pw .input { padding-right: 50px; }
    .eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); border: none; background: var(--chip); color: var(--muted); width: 36px; height: 32px; padding: 0; border-radius: 8px; cursor: pointer; display: grid; place-items: center; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
    .eye:hover { color: var(--text); }
    .eye svg { width: 18px; height: 18px; display: block; pointer-events: none; }
    .eye .ic-off { display: none; }
    .eye.on .ic-off { display: block; }
    .eye.on .ic-open { display: none; }
    .eye.on { color: var(--brand); }

    .inv-in { width: 84px; text-align: center; padding: 8px 6px; }
    .inv-in.low { background: #fef9c3; border-color: #facc15; color: #0f172a; }
    .inv-in.out { background: #fee2e2; border-color: #f87171; color: #0f172a; }
    #invBox th, #invBox td { white-space: nowrap; }
    #invBox tfoot th, #invBox tfoot td { border-top: 2px solid var(--line); font-weight: 800; }

    /* ---- Top bar preview ---- */
    .tb-prev { background: linear-gradient(90deg, #064e3b, #0f766e); color: #fff; border-radius: 12px; margin-top: 4px; overflow: hidden; padding: 10px 56px; }
    .tb-prev-text { font-weight: 700; line-height: 1.4; white-space: pre-line; word-break: break-word; }

    .dlg { max-width: 420px; margin: auto; border-radius: 20px; padding: 22px; }
    .dlg-ov { align-items: center; }
    .dlg-msg { font-size: 15px; line-height: 1.6; margin-bottom: 12px; white-space: pre-line; }
    .dlg-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; }
    .dlg-in { margin-top: 6px; }
    .chart { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; align-items: end; min-height: 220px; }
    .col { display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
    .bar-v { width: 100%; flex: 1; min-height: 120px; background: var(--chip); border-radius: 10px; display: flex; align-items: flex-end; overflow: hidden; }
    .bar-v span { display: block; width: 100%; background: linear-gradient(180deg, #34d399, #047857); border-radius: 10px 10px 0 0; min-height: 4px; }
    .cnt { font-weight: 800; font-size: 13px; }
    .lbl { font-size: 12px; color: var(--muted); }
    .sales { font-size: 11px; color: var(--muted); text-align: center; }
    .chk { display: flex; align-items: center; gap: 8px; color: var(--text); font-size: 14px; font-weight: 700; }
    .chk-row { justify-content: flex-end; }

    /* ---- Badges, IDs, banners ---- */
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; white-space: nowrap; }
    .s-Pending { background: #fef3c7; color: #92400e; }
    .s-Confirmed { background: #dbeafe; color: #1e40af; }
    .s-Delivered { background: #dcfce7; color: #166534; }
    .s-Cancelled { background: #fee2e2; color: #991b1b; }
    .pid { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 800; background: var(--chip); padding: 4px 9px; border-radius: 8px; cursor: pointer; letter-spacing: .4px; font-size: 13px; }
    .pid:hover { outline: 2px solid var(--brand-2); }
    .msg { font-size: 13px; font-weight: 700; margin-top: 10px; min-height: 18px; }
    .msg.ok { color: #15803d; }
    .msg.err { color: var(--danger); }
    .banner { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-radius: 14px; margin-bottom: 14px; font-size: 14px; font-weight: 600; }
    .banner.warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    :root[data-theme="dark"] .banner.warn { background: #3b2a08; color: #fde68a; border-color: #5c4311; }

    /* ---- Dashboard ---- */
    .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
    @media (min-width: 900px) { .stats { grid-template-columns: repeat(4, 1fr); } }
    .stat { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 16px; display: flex; gap: 12px; align-items: center; box-shadow: var(--shadow); }
    .sicon { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; }
    .stat.blue .sicon { background: #dbeafe; }
    .stat.green .sicon { background: #dcfce7; }
    .stat.amber .sicon { background: #fef3c7; }
    .stat.purple .sicon { background: #ede9fe; }
    .sval { font-size: 20px; font-weight: 800; letter-spacing: -.3px; }
    .slabel { font-size: 12px; color: var(--muted); font-weight: 700; margin-top: 2px; }
    .bar-row { margin-bottom: 12px; }
    .bar-top { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 6px; }
    .bar { height: 9px; background: var(--chip); border-radius: 99px; overflow: hidden; }
    .bar > span { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #10b981, #0ea5e9); transition: width .4s; }
    .kpi { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px dashed var(--line); font-size: 14px; }
    .kpi:last-child { border-bottom: none; }

    /* ---- Order cards ---- */
    .toolbar { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 12px; }
    @media (min-width: 760px) { .toolbar { grid-template-columns: 2fr 1fr 1fr; } }
    .order-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    @media (min-width: 760px) { .order-grid { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 1100px) { .order-grid { grid-template-columns: 1fr 1fr 1fr; } }
    .ocard { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 14px; cursor: pointer; transition: transform .12s, box-shadow .12s; box-shadow: var(--shadow); }
    .ocard:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(15,23,42,.1); }
    .ohead { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    .oname { font-weight: 800; font-size: 16px; margin-bottom: 4px; word-break: break-word; }
    .ometa { font-size: 13px; color: var(--muted); margin-bottom: 10px; word-break: break-word; }
    .ofoot { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--line); padding-top: 10px; }
    .ofoot strong { font-size: 17px; color: var(--brand); }
    .ofoot small { color: var(--muted); font-size: 12px; }
    .more { margin-top: 14px; text-align: center; }
    .savebar { display: flex; justify-content: flex-end; margin-top: 4px; }

    /* ---- Images ---- */
    .img-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .img-card { position: relative; width: 96px; height: 96px; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--chip); }
    .img-card img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
    .img-card button { position: absolute; top: 4px; right: 4px; background: rgba(15,23,42,.8); color: #fff; border: none; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; cursor: pointer; }

    /* ---- List rows & table ---- */
    .list-item { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px dashed var(--line); flex-wrap: wrap; }
    .list-item:last-child { border-bottom: none; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); white-space: nowrap; }
    th { color: var(--muted); font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: .4px; }

    /* ---- Modal, toast ---- */
    .overlay { position: fixed; inset: 0; background: rgba(2,6,23,.55); backdrop-filter: blur(3px); display: none; align-items: flex-end; justify-content: center; z-index: 100; }
    .overlay.show { display: flex; }
    .sheet { width: 100%; max-width: 620px; max-height: 92vh; overflow-y: auto; background: var(--card); color: var(--text); border-radius: 22px 22px 0 0; padding: 18px 18px calc(18px + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -20px 60px rgba(0,0,0,.3); position: relative; }
    @media (min-width: 760px) { .overlay { align-items: center; } .sheet { border-radius: 22px; } }
    .sheet-close { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; border-radius: 50%; border: none; background: var(--chip); cursor: pointer; font-size: 15px; }
    .mhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; padding-right: 36px; flex-wrap: wrap; }
    .sheet h3 { font-size: 19px; margin: 6px 0 12px; }
    .kv { display: grid; grid-template-columns: 120px 1fr; gap: 8px 12px; font-size: 14px; margin-bottom: 14px; }
    .kv dt { color: var(--muted); font-weight: 700; }
    .kv dd { word-break: break-word; }
    .preview-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); }
    .hint-text { font-size: 12.5px; color: var(--muted); margin-top: 8px; }
    .toasts { position: fixed; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; z-index: 200; width: min(92vw, 420px); pointer-events: none; }
    .toast { background: #0f172a; color: #fff; padding: 12px 16px; border-radius: 14px; font-weight: 700; font-size: 14px; box-shadow: 0 12px 30px rgba(0,0,0,.3); animation: up .2s ease; transition: opacity .3s; }
    .toast.ok { background: #065f46; }
    .toast.err { background: #991b1b; }
    .toast.out { opacity: 0; }
    .actions5 { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; margin: 12px 0; }
    .actions5 .btn { padding: 8px 2px; font-size: 11px; border-radius: 9px; overflow: hidden; text-overflow: ellipsis; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .chip { border: 1px solid var(--line); background: var(--chip); color: var(--text); border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .chip.on { background: var(--brand); color: #fff; border-color: var(--brand); }
    .chip b { margin-left: 4px; }
    .th-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 14px; }
    @media (min-width: 560px) { .th-grid { grid-template-columns: repeat(5, 1fr); } }
    .th-btn { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 10px; border: 1px solid var(--line); background: var(--input); color: var(--text); font-size: 12px; font-weight: 700; cursor: pointer; }
    .th-btn.on { border-color: var(--brand); box-shadow: 0 0 0 2px rgba(5,150,105,.25); }
    .th-sw { width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0; }
    .pr-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    @media (min-width: 900px) { .pr-grid { grid-template-columns: 1.1fr .9fr; } .pr-side { position: sticky; top: 120px; align-self: start; max-height: 80vh; overflow: auto; } }
    .pr-side { background: var(--chip); border-radius: 14px; padding: 10px; }
    .show-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; margin: 8px 0 14px; }
    @media (min-width: 700px) { .show-grid { grid-template-columns: repeat(4, 1fr); } }
    .show-grid .chk { font-size: 13px; }
    .logo-thumb { height: 40px; border-radius: 8px; background: #fff; padding: 4px; }
    .acc-head { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; background: none; border: none; color: var(--text); cursor: pointer; padding: 0; text-align: left; }
    .acc-title { font-size: 16px; font-weight: 800; }
    .acc-arrow { font-size: 18px; color: var(--muted); }
    details.adv { margin: 8px 0 14px; border: 1px dashed var(--line); border-radius: 12px; padding: 10px 12px; }
    details.adv summary { cursor: pointer; font-weight: 800; }
    @keyframes up { from { transform: translateY(10px); opacity: 0; } to { transform: none; opacity: 1; } }
  </style>
</head>
<body>

  <!-- ===== Login ===== -->
  <div id="loginView" class="login-screen hidden">
    <button class="icon-btn login-lang" data-action="lang" data-lang-toggle>বাং</button>
    <div class="login-card">
      <div class="login-logo">🛍️</div>
      <h1 data-i18n="login_title"></h1>
      <p class="sub" data-i18n="login_sub"></p>
      <div class="field">
        <label for="loginUser" data-i18n="username"></label>
        <input class="input" type="text" id="loginUser" autocomplete="username" autocapitalize="none" spellcheck="false">
      </div>
      <div class="field">
        <label for="loginPass" data-i18n="password"></label>
        <div class="pw"><input class="input" type="password" id="loginPass" autocomplete="current-password"><button type="button" class="eye" data-action="toggle-pw" data-target="loginPass" aria-label="show" tabindex="-1"></button></div>
      </div>
      <button class="btn full-login" data-action="login" data-i18n="login_btn"></button>
      <div class="login-error" id="loginErr"></div>
    </div>
  </div>

  <!-- ===== App ===== -->
  <div id="appView" class="hidden">
    <header class="topbar">
      <div class="brand"><span class="dot">🛍️</span><span class="name">Admin Panel</span></div>
      <div class="top-actions">
        <button class="icon-btn" data-action="lang" data-lang-toggle title="Language">বাং</button>
        <button class="icon-btn" data-action="theme" data-tip="theme_tip" title="Theme">🌓</button>
        <span class="avatar" id="whoBadge">A</span>
        <button class="icon-btn" data-action="logout" data-tip="logout" title="Logout" aria-label="Logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"/><path d="M5.6 6.6a8 8 0 1 0 12.8 0"/></svg>
        </button>
      </div>
    </header>

    <nav class="nav">
      <div class="nav-inner">
        <button class="nav-btn" data-action="go" data-view="dashboard" data-i18n="nav_dash"></button>
        <button class="nav-btn" data-action="go" data-view="orders" data-i18n="nav_orders"></button>
        <button class="nav-btn" data-action="go" data-view="product" data-i18n="nav_product"></button>
        <button class="nav-btn" data-action="go" data-view="offers" data-i18n="nav_offers"></button>
        <button class="nav-btn" data-action="go" data-view="inventory" data-i18n="nav_inventory"></button>
        <button class="nav-btn" data-action="go" data-view="admins" data-i18n="nav_admins"></button>
        <button class="nav-btn" data-action="go" data-view="logs" data-i18n="nav_logs"></button>
        <button class="nav-btn" data-action="go" data-view="settings" data-i18n="nav_settings"></button>
      </div>
    </nav>

    <div class="ptr" id="ptr"></div>

    <main>

      <!-- Dashboard -->
      <section id="v-dashboard" class="view">
        <div class="view-head">
          <div><h2 data-i18n="dash_title"></h2><p id="todayText"></p></div>
          <button class="btn ghost sm" data-action="refresh" data-i18n="refresh"></button>
        </div>
        <div class="banner warn hidden" id="pwBanner">
          <span data-i18n="pw_warn"></span>
          <button class="btn sm" data-action="go" data-view="settings" data-i18n="change_pw"></button>
        </div>
        <div class="stats" id="statsGrid"></div>
        <div class="card"><div class="card-head"><h3 data-i18n="daily_title"></h3></div><div id="dailyBox"></div></div>
        <div class="grid-2">
          <div class="card"><div class="card-head"><h3 data-i18n="status_bars"></h3></div><div id="statusBars"></div></div>
          <div class="card"><div class="card-head"><h3 data-i18n="stock_box"></h3></div><div id="stockBox"></div></div>
        </div>
        <div class="card">
          <div class="card-head"><h3 data-i18n="recent"></h3><button class="btn ghost sm" data-action="go" data-view="orders" data-i18n="see_all"></button></div>
          <div class="order-grid" id="recentList"></div>
        </div>
      </section>

      <!-- Orders -->
      <section id="v-orders" class="view hidden">
        <div class="view-head">
          <div><h2 data-i18n="orders_title"></h2><p data-i18n="orders_sub"></p></div>
          <div class="row">
            <button class="btn ghost sm" data-action="refresh" data-i18n="refresh"></button>
            <button class="btn sm" data-action="csv">📥 <span data-i18n="csv"></span></button>
          </div>
        </div>
        <div class="toolbar">
          <input class="input" id="oSearch" type="search" data-i18n-ph="search_ph" autocomplete="off">
          <select class="input" id="oStatus">
            <option value="all" data-i18n="all_status"></option>
            <option value="Pending" data-i18n="st_Pending"></option>
            <option value="Confirmed" data-i18n="st_Confirmed"></option>
            <option value="Delivered" data-i18n="st_Delivered"></option>
            <option value="Cancelled" data-i18n="st_Cancelled"></option>
          </select>
          <select class="input" id="oRange">
            <option value="all" data-i18n="all_time"></option>
            <option value="today" data-i18n="today"></option>
            <option value="7d" data-i18n="last7"></option>
          </select>
        </div>
        <div class="muted" id="oCount" style="margin-bottom:10px;"></div>
        <div class="order-grid" id="oList"></div>
        <div class="more"><button class="btn ghost hidden" id="oMore" data-action="more" data-i18n="load_more"></button></div>
      </section>

      <!-- Product -->
      <section id="v-product" class="view hidden">
        <div class="view-head"><div><h2 data-i18n="prod_title"></h2><p data-i18n="prod_sub"></p></div></div>

        <div class="card">
          <h3 data-i18n="tb_title"></h3>
          <p class="hint-text" style="margin:-4px 0 10px;" data-i18n="tb_hint"></p>
          <div class="grid-2">
            <div class="field"><label for="tbBn" data-i18n="tb_bn"></label><textarea class="input" id="tbBn" rows="2" maxlength="200"></textarea></div>
            <div class="field"><label for="tbEn" data-i18n="tb_en"></label><textarea class="input" id="tbEn" rows="2" maxlength="200"></textarea></div>
          </div>
          <div class="grid-4">
            <div class="field"><label for="tbSize" data-i18n="tb_size"></label><input class="input" type="number" id="tbSize" min="9" max="32" step="1"></div>
            <div class="field"><label for="tbAlign" data-i18n="tb_align"></label>
              <select class="input" id="tbAlign">
                <option value="left" data-i18n="tb_left"></option>
                <option value="center" data-i18n="tb_center"></option>
                <option value="right" data-i18n="tb_right"></option>
              </select>
            </div>
            <div class="field"><label for="tbOffset" data-i18n="tb_offset"></label><input class="input" type="number" id="tbOffset" min="-120" max="120" step="1"></div>
            <div class="field"><label for="tbPad" data-i18n="tb_pad"></label><input class="input" type="number" id="tbPad" min="0" max="40" step="1"></div>
            <div class="field chk-row"><label class="chk"><input type="checkbox" id="tbLangShow"> <span data-i18n="tb_lang_show"></span></label></div>
            <div class="field"><label for="tbLangSize" data-i18n="tb_lang_size"></label><input class="input" type="number" id="tbLangSize" min="8" max="28" step="1"></div>
          </div>
          <div class="row" style="justify-content:space-between;">
            <span class="lbl" data-i18n="tb_preview"></span>
            <button type="button" class="btn sm ghost" data-action="tb-reset" data-i18n="tb_reset"></button>
          </div>
          <div class="tb-prev" id="tbPreview"><div class="tb-prev-text" id="tbPreviewText"></div></div>
        </div>

        <div class="card">
          <h3 data-i18n="basic"></h3>
          <div class="field chk-row"><label class="chk"><input type="checkbox" id="pActive"> <span data-i18n="visible_label"></span></label><span class="hint-text" data-i18n="visible_hint"></span></div>
          <div class="field"><label for="pTitle" data-i18n="name_label"></label><input class="input" id="pTitle"></div>
          <div class="field"><label for="pDesc" data-i18n="desc_label"></label><textarea class="input" id="pDesc" rows="4"></textarea></div>
        </div>

        <div class="card">
          <h3 data-i18n="trust_title"></h3>
          <p class="hint-text" style="margin:-4px 0 10px;" data-i18n="trust_hint"></p>
          <div id="trustEditor"></div>
        </div>

        <div class="card">
          <h3 data-i18n="prices"></h3>
          <div class="grid-3">
            <div class="field"><label for="pPrice" data-i18n="offer_price"></label><input class="input" type="number" id="pPrice" min="0"></div>
            <div class="field"><label for="pOldPrice" data-i18n="old_price"></label><input class="input" type="number" id="pOldPrice" min="0"></div>
            <div class="field"><span class="muted" data-i18n="stock_moved"></span></div>
          </div>
        </div>

        <div class="card">
          <h3 data-i18n="variants"></h3>
          <div class="grid-fields">
            <div class="field"><label for="pColors" data-i18n="colors_label"></label><input class="input" id="pColors" placeholder="কালো, সাদা, নীল"></div>
            <div class="field"><label for="pSizes" data-i18n="sizes_label"></label><input class="input" id="pSizes" placeholder="M, L, XL"></div>
            <div class="field"><label for="pDelInside" data-i18n="in_fee"></label><input class="input" type="number" id="pDelInside" min="0"></div>
            <div class="field"><label for="pDelOutside" data-i18n="out_fee"></label><input class="input" type="number" id="pDelOutside" min="0"></div>
            <div class="field"><label for="pPhone" data-i18n="call_no"></label><input class="input" id="pPhone"></div>
            <div class="field"><label for="pWhatsapp" data-i18n="wa_no"></label><input class="input" id="pWhatsapp"></div>
          </div>
        </div>

        <div class="card">
          <h3 data-i18n="images"></h3>
          <div class="grid-2">
            <div class="field">
              <label for="pRatio" data-i18n="ratio_label"></label>
              <select class="input" id="pRatio">
                <option value="auto" data-i18n="ratio_auto"></option>
                <option value="1:1">1:1</option>
                <option value="4:5">4:5</option>
                <option value="3:4">3:4</option>
                <option value="4:3">4:3</option>
                <option value="16:9">16:9</option>
              </select>
            </div>
            <div class="field">
              <label for="pBadge" data-i18n="badge_label"></label>
              <select class="input" id="pBadge">
                <option value="tl" data-i18n="pos_tl"></option>
                <option value="tr" data-i18n="pos_tr"></option>
                <option value="bl" data-i18n="pos_bl"></option>
                <option value="br" data-i18n="pos_br"></option>
              </select>
            </div>
          </div>
          <p class="hint-text" style="margin:-4px 0 12px;" data-i18n="ratio_hint"></p>
          <div class="field">
            <label for="pFiles" data-i18n="upload_images"></label>
            <input class="input" type="file" id="pFiles" accept="image/*" multiple>
          </div>
          <div class="row"><input class="input" id="pImgUrl" data-i18n-ph="or_url"><button class="btn sm ghost" data-action="add-url" data-i18n="add"></button></div>
          <div class="img-list" id="imgPreviewList"></div>
        </div>

        <div class="card">
          <div class="card-head"><h3 data-i18n="nt_title"></h3><button class="btn sm ghost" data-action="notice-add" data-i18n="nt_add"></button></div>
          <p class="hint-text" style="margin:-4px 0 10px;" data-i18n="nt_hint"></p>
          <div id="noticeEditor"></div>
        </div>

        <div class="card">
          <div class="card-head"><h3 data-i18n="faq_section"></h3><button class="btn sm ghost" data-action="faq-add" data-i18n="faq_add"></button></div>
          <div id="faqEditor"></div>
        </div>

        <div class="savebar"><button class="btn" id="saveBtn" data-action="save-product" data-i18n="save_all"></button></div>
        <div class="msg" id="productMsg"></div>
      </section>

      <!-- Offers -->
      <section id="v-offers" class="view hidden">
        <div class="view-head"><div><h2 data-i18n="off_title"></h2><p data-i18n="off_sub"></p></div>
          <button class="btn ghost sm" data-action="refresh" data-i18n="refresh"></button></div>

        <div class="stats" id="offStats"></div>

        <div class="grid-2">
          <div class="card">
            <h3 data-i18n="notes_title"></h3>
            <div class="field">
              <div class="row" style="justify-content:space-between;"><span class="lbl" data-i18n="notes_bulk"></span><label class="chk"><input type="checkbox" id="ntBulkOn"> <span data-i18n="notes_show"></span></label></div>
              <label class="lbl" for="ntBulkBn" data-i18n="notes_bn"></label><textarea class="input" id="ntBulkBn" rows="2"></textarea>
              <label class="lbl" for="ntBulkEn" data-i18n="notes_en"></label><textarea class="input" id="ntBulkEn" rows="2"></textarea>
            </div>
            <div class="field">
              <div class="row" style="justify-content:space-between;"><span class="lbl" data-i18n="notes_coupon"></span><label class="chk"><input type="checkbox" id="ntCouponOn"> <span data-i18n="notes_show"></span></label></div>
              <label class="lbl" for="ntCouponBn" data-i18n="notes_bn"></label><textarea class="input" id="ntCouponBn" rows="2"></textarea>
              <label class="lbl" for="ntCouponEn" data-i18n="notes_en"></label><textarea class="input" id="ntCouponEn" rows="2"></textarea>
            </div>
            <button class="btn" data-action="save-notes" data-i18n="notes_save"></button>
            <div class="msg" id="ntMsg"></div>
          </div>

          <div>
          <div class="card">
            <h3 data-i18n="bulk_title"></h3>
            <p class="hint-text" style="margin:-4px 0 12px;" data-i18n="bulk_hint_admin"></p>
            <div class="grid-2">
              <div class="field chk-row"><label class="chk"><input type="checkbox" id="bkOn"> <span data-i18n="bulk_enabled"></span></label></div>
              <div class="field"><label for="bkMin" data-i18n="bulk_min"></label><input class="input" type="number" id="bkMin" min="2" max="100"></div>
              <div class="field"><label for="bkType" data-i18n="bulk_type"></label><select class="input" id="bkType"><option value="percent" data-i18n="bulk_pct"></option><option value="fixed" data-i18n="bulk_fixed"></option></select></div>
              <div class="field"><label for="bkVal" data-i18n="bulk_value"></label><input class="input" type="number" id="bkVal" min="0"></div>
            </div>
            <button class="btn" data-action="save-bulk" data-i18n="bulk_save"></button>
            <div class="msg" id="bkMsg"></div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3 data-i18n="gv_title"></h3><p class="hint-text" style="margin:0;" data-i18n="gv_sub"></p></div>
              <button type="button" class="btn sm" id="gvToggle" data-action="gv-toggle"></button></div>
            <div class="grid-2">
              <div class="field"><label for="gvCode" data-i18n="gv_code"></label>
                <div class="row"><input class="input" id="gvCode" maxlength="20" autocapitalize="characters" style="text-transform:uppercase;"><button class="btn sm ghost" data-action="gv-gen" data-i18n="gv_gen"></button></div></div>
              <div class="field"><label for="gvPct" data-i18n="gv_pct"></label><input class="input" type="number" id="gvPct" min="1" max="100"></div>
              <div class="field"><label for="gvDays" data-i18n="gv_exp"></label><input class="input" type="number" id="gvDays" min="0" max="3650"></div>
              <div class="field"><label for="gvBn" data-i18n="gv_bn"></label><textarea class="input" id="gvBn" rows="2"></textarea></div>
              <div class="field"><label for="gvEn" data-i18n="gv_en"></label><textarea class="input" id="gvEn" rows="2"></textarea></div>
            </div>
            <button class="btn" data-action="gv-save" data-i18n="gv_save"></button>
            <div class="msg" id="gvMsg"></div>
          </div>
          </div>
        </div>

        <div class="card">
          <h3 data-i18n="cp_title"></h3>
          <p class="hint-text" style="margin:-4px 0 12px;" data-i18n="cp_hint"></p>
          <div class="grid-3">
            <div class="field"><label for="cpWords" data-i18n="cp_words"></label><input class="input" id="cpWords" data-i18n-ph="cp_words_ph" placeholder="EID, SALE" autocapitalize="characters"></div>
            <div class="field"><label for="cpSuffix" data-i18n="cp_suffix"></label><input class="input" type="number" id="cpSuffix" min="2" max="10" value="4"></div>
            <div class="field"><label for="cpEngine" data-i18n="cp_engine"></label>
              <select class="input" id="cpEngine">
                <option value="readable" data-i18n="cp_eng_readable"></option>
                <option value="alnum" data-i18n="cp_eng_alnum"></option>
                <option value="letters" data-i18n="cp_eng_letters"></option>
                <option value="digits" data-i18n="cp_eng_digits"></option>
              </select></div>
          </div>
          <div class="row" style="margin-bottom:12px;">
            <button class="btn sm ghost" data-action="coupon-gen" data-i18n="cp_gen_custom"></button>
            <span class="lbl" data-i18n="cp_preset"></span>
            <button type="button" class="chip" data-action="cp-pct" data-v="5">5%</button>
            <button type="button" class="chip" data-action="cp-pct" data-v="10">10%</button>
            <button type="button" class="chip" data-action="cp-pct" data-v="15">15%</button>
            <button type="button" class="chip" data-action="cp-pct" data-v="20">20%</button>
            <button type="button" class="chip" data-action="cp-pct" data-v="25">25%</button>
            <button type="button" class="chip" data-action="cp-pct" data-v="30">30%</button>
          </div>
          <div class="grid-3">
            <div class="field"><label for="cpCode" data-i18n="cp_code"></label><input class="input" id="cpCode" maxlength="20" autocapitalize="characters" style="text-transform:uppercase;"></div>
            <div class="field"><label for="cpPct" data-i18n="cp_percent"></label><input class="input" type="number" id="cpPct" min="1" max="100" value="10"></div>
            <div class="field"><label for="cpMax" data-i18n="cp_max"></label><input class="input" type="number" id="cpMax" min="0" value="0"></div>
            <div class="field"><label for="cpExpDays" data-i18n="cp_expiry"></label><input class="input" type="number" id="cpExpDays" min="0" max="3650" placeholder="0"></div>
            <div class="field"><label for="cpRule" data-i18n="cp_reward"></label>
              <select class="input" id="cpRule"><option value="none" data-i18n="cp_r_none"></option><option value="every" data-i18n="cp_r_every"></option><option value="first" data-i18n="cp_r_first"></option></select></div>
          </div>
          <div class="row" style="justify-content:space-between;">
            <label class="chk"><input type="checkbox" id="cpActive" checked> <span data-i18n="cp_active"></span></label>
            <button class="btn" data-action="coupon-create" data-i18n="cp_create"></button>
          </div>
          <div class="msg" id="cpMsg"></div>
        </div>

        <div class="card">
          <div class="card-head"><h3 data-i18n="cp_list"></h3>
            <div class="row"><input class="input" id="cpSearch" type="search" data-i18n-ph="cp_search" style="min-width:200px;width:auto;" autocomplete="off"><button class="btn sm ghost" data-action="coupon-hist-all" data-i18n="cp_history"></button></div></div>
          <div class="chips" id="cpChips"></div>
          <div class="table-wrap" id="cpList"></div>
        </div>

        <div class="card">
          <div class="card-head"><div><h3 data-i18n="rh_title"></h3><p class="hint-text" style="margin:0;" data-i18n="rh_sub"></p></div>
            <div class="row"><input class="input" id="rwSearch" type="search" data-i18n-ph="rw_search" style="min-width:200px;width:auto;" autocomplete="off"><button class="btn sm" data-action="rw-export" data-i18n="rh_export"></button></div></div>
          <div class="chips" id="rwChips"></div>
          <p class="hint-text" id="cpPersonalInfo" style="font-weight:700;"></p>
          <div class="table-wrap" id="cpPersonal"></div>
        </div>
      </section>

      <!-- Inventory -->
      <section id="v-inventory" class="view hidden">
        <div class="view-head"><div><h2 data-i18n="inv_title_h"></h2><p data-i18n="inv_sub"></p></div>
          <button class="btn ghost sm" data-action="refresh" data-i18n="refresh"></button></div>

        <div class="card">
          <h3 data-i18n="inv_add_title"></h3>
          <p class="hint-text" style="margin:-4px 0 10px;" data-i18n="inv_add_hint"></p>
          <div class="grid-3">
            <div class="field"><label for="ivColor" data-i18n="inv_add_color"></label><input class="input" id="ivColor" maxlength="40" autocomplete="off"></div>
            <div class="field"><label for="ivSize" data-i18n="inv_add_size"></label><input class="input" id="ivSize" maxlength="40" autocomplete="off"></div>
            <div class="field"><label for="ivQty" data-i18n="inv_add_qty"></label><input class="input" type="number" id="ivQty" min="0" value="0"></div>
          </div>
          <button class="btn" data-action="add-variant" data-i18n="inv_add_btn"></button>
          <div class="msg" id="ivMsg"></div>
        </div>

        <div class="card">
          <div class="table-wrap" id="invBox"></div>
          <div class="row" style="justify-content:space-between;margin-top:14px;">
            <p class="hint-text" data-i18n="inv_note"></p>
            <button class="btn" data-action="save-inv" data-i18n="inv_save"></button>
          </div>
        </div>
      </section>

      <!-- Admins -->
      <section id="v-admins" class="view hidden">
        <div class="view-head"><div><h2 data-i18n="admins_title"></h2><p data-i18n="admins_sub"></p></div></div>
        <div class="card">
          <div class="card-head"><h3 data-i18n="sec_head"></h3><button class="btn sm ghost" data-action="sec-refresh" data-i18n="refresh"></button></div>
          <div class="stats" id="secStats"></div>
          <div class="row" style="justify-content:space-between;"><span class="muted" id="secInfo"></span><button class="btn sm danger" data-action="logout-all" data-i18n="logout_all_btn"></button></div>
        </div>
        <div class="card">
          <h3 data-i18n="add_admin"></h3>
          <div class="grid-2">
            <div class="field"><label for="nuUser" data-i18n="username"></label><input class="input" id="nuUser" autocapitalize="none" placeholder="rahim"></div>
            <div class="field"><label for="nuPass" data-i18n="pw_min8"></label><div class="pw"><input class="input" type="password" id="nuPass" autocomplete="new-password"><button type="button" class="eye" data-action="toggle-pw" data-target="nuPass" aria-label="show" tabindex="-1"></button></div></div>
          </div>
          <button class="btn" data-action="add-user" data-i18n="add_admin_btn"></button>
          <div class="msg" id="userMsg"></div>
        </div>
        <div class="card">
          <h3 data-i18n="admin_list"></h3>
          <div id="userList"></div>
        </div>
      </section>

      <!-- Logs -->
      <section id="v-logs" class="view hidden">
        <div class="view-head"><div><h2 data-i18n="logs_title"></h2><p data-i18n="logs_sub"></p></div>
          <button class="btn ghost sm" data-action="refresh" data-i18n="refresh"></button></div>
        <div class="chips" id="logChips"></div>
        <div class="card"><div class="table-wrap" id="logBox"></div></div>
      </section>

      <!-- Settings -->
      <section id="v-settings" class="view hidden">
        <div class="view-head"><div><h2 data-i18n="settings_title"></h2><p data-i18n="settings_sub"></p></div></div>

        <div class="card">
          <button type="button" class="acc-head" data-action="sa-toggle">
            <span class="acc-title" data-i18n="sa_title"></span><span class="acc-arrow" id="saArrow">▸</span>
          </button>
          <div id="saWrap" class="hidden" style="margin-top:12px;">
        <div class="grid-2">
          <div class="card">
            <h3 data-i18n="un_title"></h3>
            <div class="field"><label for="unCur" data-i18n="cur_pw"></label><div class="pw"><input class="input" type="password" id="unCur" autocomplete="current-password"><button type="button" class="eye" data-action="toggle-pw" data-target="unCur" aria-label="show" tabindex="-1"></button></div></div>
            <div class="field"><label for="unNew" data-i18n="un_new"></label><input class="input" id="unNew" autocapitalize="none" autocomplete="off" spellcheck="false"></div>
            <button class="btn" data-action="un-save" data-i18n="un_save"></button>
            <div class="msg" id="unMsg"></div>
          </div>
          <div class="card">
            <h3 data-i18n="pw_section"></h3>
            <div class="field"><label for="cpCurrent" data-i18n="cur_pw"></label><div class="pw"><input class="input" type="password" id="cpCurrent" autocomplete="current-password"><button type="button" class="eye" data-action="toggle-pw" data-target="cpCurrent" aria-label="show" tabindex="-1"></button></div></div>
            <div class="grid-2">
              <div class="field"><label for="cpNew" data-i18n="new_pw"></label><div class="pw"><input class="input" type="password" id="cpNew" autocomplete="new-password"><button type="button" class="eye" data-action="toggle-pw" data-target="cpNew" aria-label="show" tabindex="-1"></button></div></div>
              <div class="field"><label for="cpConfirm" data-i18n="repeat_pw"></label><div class="pw"><input class="input" type="password" id="cpConfirm" autocomplete="new-password"><button type="button" class="eye" data-action="toggle-pw" data-target="cpConfirm" aria-label="show" tabindex="-1"></button></div></div>
            </div>
            <button class="btn" data-action="change-pass" data-i18n="change_pw"></button>
            <div class="msg" id="passMsg"></div>
          </div>
        </div>

          <div class="list-item">
            <div><strong data-i18n="logout_this"></strong><div class="muted" data-i18n="logout_this_d"></div></div>
            <button class="btn ghost sm" data-action="logout" data-i18n="logout"></button>
          </div>
          <div class="list-item">
            <div><strong data-i18n="logout_all"></strong><div class="muted" data-i18n="logout_all_d"></div></div>
            <button class="btn danger sm" data-action="logout-all" data-i18n="logout_all_btn"></button>
          </div>
          </div>
        </div>
        <div class="card">
          <button type="button" class="acc-head" data-action="pr-toggle">
            <span><span class="acc-title" data-i18n="pr_title"></span><span class="hint-text" style="display:block;margin:2px 0 0;" data-i18n="pr_sub"></span></span>
            <span class="acc-arrow" id="prArrow">▸</span>
          </button>
          <div id="printWrap" class="hidden" style="margin-top:12px;"><div id="printBox"></div></div>
        </div>

      </section>

    </main>
  </div>

  <!-- Modal (order detail / invoice preview) -->
  <div class="overlay" id="modal">
    <div class="sheet">
      <button class="sheet-close" data-action="close-modal" aria-label="close">✕</button>
      <div id="modalBody"></div>
    </div>
  </div>

  <div class="toasts" id="toasts"></div>

  <script nonce="${nonce}">
    const DICT = ${adminDict};
    const TB_DEF = ${tbDefaults};
    const MAX_IMAGES = ${MAX_IMAGES};
    const MAX_NOTICES = ${MAX_NOTICES};
    const LOW_STOCK_VIEW = ${LOW_STOCK};
    const STATUSES = ['Pending', 'Confirmed', 'Delivered', 'Cancelled'];
    const VIEWS = ['dashboard', 'orders', 'product', 'offers', 'inventory', 'admins', 'logs', 'settings'];
    const NF = {
      sans: "'Segoe UI', Roboto, 'Noto Sans Bengali', sans-serif",
      serif: "Georgia, 'Times New Roman', 'Noto Serif Bengali', serif",
      mono: "ui-monospace, Menlo, Consolas, monospace",
      display: "Impact, 'Arial Black', 'Noto Sans Bengali', sans-serif"
    };
    const ACTION_KEYS = {
      login_ok: ['লগইন', 'Login'], login_fail: ['ব্যর্থ লগইন', 'Failed login'], logout_all: ['সব device logout', 'Logout all'],
      order_create: ['নতুন অর্ডার', 'New order'], order_status: ['স্ট্যাটাস বদল', 'Status change'], order_delete: ['অর্ডার ডিলিট', 'Order deleted'],
      order_note: ['অর্ডার নোট', 'Order note'],
      product_update: ['প্রোডাক্ট আপডেট', 'Product updated'], admin_add: ['অ্যাডমিন যোগ', 'Admin added'], admin_delete: ['অ্যাডমিন ডিলিট', 'Admin deleted'],
      admin_reset: ['পাসওয়ার্ড রিসেট', 'Password reset'], password_change: ['পাসওয়ার্ড বদল', 'Password changed'],
      inventory_update: ['স্টক আপডেট', 'Stock updated'], inventory_add: ['প্রোডাক্ট যোগ (ইনভেন্টরি)', 'Product added (inventory)'],
      notes_update: ['নোট পরিবর্তন', 'Notes updated'], bulk_offer: ['বাল্ক অফার', 'Bulk offer'],
      coupon_create: ['কুপন তৈরি', 'Coupon created'], coupon_update: ['কুপন চালু/বন্ধ', 'Coupon toggled'], coupon_delete: ['কুপন ডিলিট', 'Coupon deleted']
    };
    ACTION_KEYS.username_change = ['ইউজারনেম বদল', 'Username changed'];
    ACTION_KEYS.print_save = ['প্রিন্ট ডিজাইন সেভ', 'Print design saved'];
    ACTION_KEYS.giveaway_save = ['Give way সেভ', 'Give way saved'];
    // সার্ভারের বাংলা error বার্তার English অনুবাদ (অ্যাডমিন English মোডে)
    const ERR_EN = {
      'লগইন করুন!': 'Please sign in!',
      'সেশন শেষ হয়েছে': 'Session expired',
      'ইউজারনেম ও পাসওয়ার্ড দিন!': 'Enter username and password!',
      'ইউজারনেম বা পাসওয়ার্ড ভুল!': 'Wrong username or password!',
      'অনেকবার ভুল চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।': 'Too many failed attempts. Try again later.',
      'এই উৎস থেকে অনেক অর্ডারের চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।': 'Too many order attempts from this source. Please try again later.',
      'অর্ডারের অবস্থা পরিবর্তিত হয়েছে, আবার চেষ্টা করুন।': 'The order status changed. Please try again.',
      'নতুন পাসওয়ার্ড আগেরটির থেকে আলাদা হতে হবে!': 'New password must differ from the current one!',
      'নতুন পাসওয়ার্ড ৮–২০০ অক্ষরের হতে হবে!': 'New password must be 8–200 characters!',
      'বর্তমান পাসওয়ার্ড ভুল!': 'Current password is wrong!',
      'পাসওয়ার্ড ৮–২০০ অক্ষরের হতে হবে!': 'Password must be 8–200 characters!',
      'ইউজার পাওয়া যায়নি!': 'User not found!',
      'এই ইউজারনেম আগে থেকেই আছে!': 'This username already exists!',
      'ইউজারনেম ৩-৩২ অক্ষর, শুধু a-z, 0-9, _ . - ব্যবহার করুন।': 'Username: 3–32 characters, a-z, 0-9, _ . - only.',
      'নিজেকে ডিলিট করা যাবে না!': 'You cannot delete yourself!',
      'প্রোডাক্টের নাম লিখুন!': 'Enter the product name!',
      'সঠিক অফার মূল্য দিন!': 'Enter a valid offer price!',
      'সংখ্যা ঋণাত্মক হতে পারবে না!': 'Numbers cannot be negative!',
      'অন্তত একটি প্রোডাক্টের ছবি যুক্ত করুন!': 'Add at least one product image!',
      'ছবির লিংক বা ফাইল সঠিক নয়!': 'Invalid image link or file!',
      'ছবির সাইজ অনেক বড়। কম সংখ্যক ছবি দিন বা ছবি ছোট করুন।': 'Images are too large. Use fewer or smaller images.',
      'নোটিসের ছবি অনেক বড়। ছোট ছবি দিন।': 'Notice images are too large. Use smaller images.',
      'অনুরোধ অনেক বড়। ছবির সাইজ কমান।': 'Request too large. Reduce image size.',
      'কল নাম্বার সঠিক নয়!': 'Invalid call number!',
      'WhatsApp নাম্বার সঠিক নয়!': 'Invalid WhatsApp number!',
      'অর্ডার আইডি সঠিক নয়!': 'Invalid order ID!',
      'অর্ডার পাওয়া যায়নি!': 'Order not found!',
      'স্টক না থাকায় অর্ডার আবার চালু করা যাবে না!': 'Cannot reopen: not enough stock!',
      'স্টকের সংখ্যা ০ থেকে ১,০০,০০০ এর মধ্যে হতে হবে!': 'Stock must be between 0 and 100,000!',
      'কালার বা সাইজ অন্তত একটি লিখুন!': 'Enter at least a color or a size!',
      'কালার লিখুন!': 'Enter a color!',
      'সাইজ লিখুন!': 'Enter a size!',
      'কুপন কোড কমপক্ষে ৪ অক্ষরের হতে হবে (A-Z, 0-9)।': 'Coupon code must be at least 4 characters (A-Z, 0-9).',
      'ছাড়ের শতাংশ ১ থেকে ১০০ এর মধ্যে দিন।': 'Discount must be 1–100%.',
      'এই কুপন কোডটি আগে থেকেই আছে।': 'This coupon code already exists.',
      'মেয়াদের তারিখ সঠিক নয়।': 'Invalid expiry date.',
      'এই অনুরোধ অনুমোদিত নয়।': 'This request is not allowed.',
      'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন।': 'Server error, please try again.',
      'Invalid request': 'Invalid request'
    };
    ERR_EN['নতুন ইউজারনেম আগেরটির থেকে আলাদা হতে হবে!'] = 'New username must differ from the current one!';
    ERR_EN['প্রিন্ট সেটিং অনেক বড়।'] = 'Print settings are too large.';
    ERR_EN['আগে কুপন কোড সেভ করুন।'] = 'Save a coupon code first.';
    ERR_EN['এই কুপন কোড নেই। আগে Create coupon থেকে কুপন তৈরি করুন।'] = 'This coupon code does not exist. Create it in Create coupon first.';
    const NOTICE_DEFAULT = { on: true, head_bn: '', head_en: '', body_bn: '', body_en: '', image: '', font: 'sans', align: 'left', head_size: 20, body_size: 15, head_color: '#0f172a', body_color: '#475569', bg: '', bold: true };
    const DEFAULT_FAQ_BLANK = { qbn: '', qen: '', abn: '', aen: '' };

    // পাসওয়ার্ড দেখানোর চোখ আইকন
    const EYE_SVG = '<svg class="ic-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>' +
      '<svg class="ic-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-7 0-11-7-11-7a19.8 19.8 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a19.9 19.9 0 0 1-3.17 4.19"/><path d="M1 1l22 22"/></svg>';

    var prefsStore = {
      get: function (k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
      set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    var store = {
      get: function (k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } },
      set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
      del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
    };

    var LANG = 'en';
    var TOKEN = store.get('admin_token');
    var ME = null;
    var MUST_CHANGE = false;
    var PRODUCT = {};
    var STATS = {};
    var ORDERS = [];
    var CACHE = {};
    var HAS_MORE = false;
    var REQ_SEQ = 0;
    var VIEW = 'dashboard';
    var IMAGES = [];
    var TRUST = [];
    var FAQS = [];
    var NOTICES = [];
    var searchTimer = null;
    var OFFERS = { bulk: null, coupons: [], notes: {}, personal: [], rewardRules: 0 };
    var INV_ROWS = [];

    function $(id) { return document.getElementById(id); }

    function t(key, vars) {
      var s = (DICT[LANG] && DICT[LANG][key]) || DICT.bn[key] || key;
      if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(String(vars[k])); });
      return s;
    }

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function splitList(str) {
      return String(str || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    function money(n) { return '৳' + Number(n || 0).toLocaleString('en-US'); }
    function statusLabel(st) { return t('st_' + st); }

    function fmtDate(s) {
      try {
        var d = new Date(String(s).replace(' ', 'T') + 'Z');
        return esc(d.toLocaleString(LANG === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }));
      } catch (e) { return esc(s); }
    }

    function toast(msg, type) {
      var el = document.createElement('div');
      el.className = 'toast ' + (type || '');
      el.textContent = msg;
      $('toasts').appendChild(el);
      setTimeout(function () { el.classList.add('out'); }, 2200);
      setTimeout(function () { el.remove(); }, 2600);
    }

    function setMsg(id, text, ok) {
      var el = $(id);
      el.textContent = text || '';
      el.className = 'msg ' + (ok ? 'ok' : 'err');
    }

    function openModal(html) { $('modalBody').innerHTML = html; $('modal').classList.add('show'); }
    function closeModal() { $('modal').classList.remove('show'); }

    /* ---------- Password eye ---------- */

    function initEyes() {
      document.querySelectorAll('.eye').forEach(function (b) { b.innerHTML = EYE_SVG; });
    }

    function togglePw(btn) {
      var inp = $(btn.getAttribute('data-target'));
      if (!inp) return;
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.classList.toggle('on', show);
      btn.setAttribute('aria-label', show ? 'hide' : 'show');
    }

    function resetPwFields() {
      document.querySelectorAll('.pw .input').forEach(function (inp) { inp.type = 'password'; });
      document.querySelectorAll('.eye').forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-label', 'show'); });
    }

    function notify(msg) {
      toast(msg, /সফল|হয়েছে|সেভ|✅|যোগ হয়েছে|কপি|saved|added|copied|updated|deleted/i.test(String(msg)) ? 'ok' : 'err');
    }

    function askDialog(opts) {
      return new Promise(function (resolve) {
        var ov = document.createElement('div');
        ov.className = 'overlay show dlg-ov';
        var inputHtml = opts.input
          ? '<input class="input dlg-in" type="' + (opts.password ? 'password' : 'text') + '" autocomplete="off">'
          : '';
        ov.innerHTML = '<div class="sheet dlg"><p class="dlg-msg"></p>' + inputHtml +
          '<div class="dlg-actions"><button class="btn ghost" data-r="cancel"></button>' +
          '<button class="btn ' + (opts.danger ? 'danger-solid' : '') + '" data-r="ok"></button></div></div>';
        ov.querySelector('.dlg-msg').textContent = opts.msg;
        ov.querySelector('[data-r="cancel"]').textContent = t('cancel');
        ov.querySelector('[data-r="ok"]').textContent = t('ok');
        function done(value) {
          document.removeEventListener('keydown', onKey);
          ov.remove();
          resolve(value);
        }
        function onKey(e) {
          if (e.key === 'Escape') done(opts.input ? null : false);
          if (e.key === 'Enter' && !opts.input) done(true);
          if (e.key === 'Enter' && opts.input) done(ov.querySelector('.dlg-in').value || null);
        }
        ov.addEventListener('click', function (e) {
          var r = e.target.getAttribute && e.target.getAttribute('data-r');
          if (r === 'ok') done(opts.input ? (ov.querySelector('.dlg-in').value || null) : true);
          else if (r === 'cancel') done(opts.input ? null : false);
        });
        document.addEventListener('keydown', onKey);
        document.body.appendChild(ov);
        var inp = ov.querySelector('.dlg-in');
        if (inp) setTimeout(function () { inp.focus(); }, 60);
      });
    }

    function askConfirm(msg, danger) { return askDialog({ msg: msg, danger: danger }); }
    function askText(msg, password) { return askDialog({ msg: msg, input: true, password: password }); }

    /* ---------- Theme & language (admin-এর আলাদা storage key) ---------- */

    function applyTheme(th) {
      document.documentElement.setAttribute('data-theme', th);
      prefsStore.set('admin_theme', th);
    }

    function initTheme() {
      var saved = prefsStore.get('admin_theme');
      if (saved === 'dark' || saved === 'light') { applyTheme(saved); return; }
      var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(dark ? 'dark' : 'light');
    }

    function toggleTheme() {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }

    function applyLang() {
      document.documentElement.lang = LANG;
      document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
      document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
      document.querySelectorAll('[data-tip]').forEach(function (el) { el.title = t(el.getAttribute('data-tip')); });
      document.querySelectorAll('[data-lang-toggle]').forEach(function (el) { el.textContent = LANG === 'bn' ? 'EN' : 'বাং'; });
      document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === VIEW); });
    }

    function toggleLang() {
      LANG = LANG === 'bn' ? 'en' : 'bn';
      prefsStore.set('admin_lang', LANG);
      applyLang();
      if (TOKEN && ME) {
        $('todayText').textContent = todayString();
        renderEditors();
        renderTbPreview();
        renderInventory();
        refreshCurrent();
      }
      if ($('modal').classList.contains('show')) closeModal();
    }

    function todayString() {
      return new Date().toLocaleDateString(LANG === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'Asia/Dhaka', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    /* ---------- API ---------- */

    async function api(path, method, body) {
      var opts = { method: method || 'GET', headers: {} };
      if (TOKEN) opts.headers['Authorization'] = 'Bearer ' + TOKEN;
      if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      var res;
      try { res = await fetch(path, opts); }
      catch (e) { return { ok: false, status: 0, data: { error: t('net_error') } }; }
      var data = await res.json().catch(function () { return {}; });
      if (LANG === 'en' && data && data.error && ERR_EN[data.error]) data.error = ERR_EN[data.error];
      if (res.status === 401 && path !== '/api/admin/login') {
        forceLogout(t('session_expired'));
      }
      return { ok: res.ok, status: res.status, data: data };
    }

    function cacheOrders(list) {
      list.forEach(function (o) { CACHE[o.public_id] = o; });
    }

    /* ---------- Auth ---------- */

    function showLogin(msg) {
      $('appView').classList.add('hidden');
      $('loginView').classList.remove('hidden');
      $('loginErr').textContent = msg || '';
      resetPwFields();
    }

    function showApp() {
      $('loginView').classList.add('hidden');
      $('appView').classList.remove('hidden');
      $('whoBadge').textContent = (ME.username || 'A').charAt(0).toUpperCase();
      $('pwBanner').classList.toggle('hidden', !MUST_CHANGE);
      $('todayText').textContent = todayString();
      var saved = store.get('admin_view');
      go(VIEWS.indexOf(saved) >= 0 ? saved : 'dashboard');
    }

    function forceLogout(msg) {
      TOKEN = '';
      ME = null;
      MUST_CHANGE = false;
      store.del('admin_token');
      closeModal();
      showLogin(msg);
    }

    async function boot() {
      if (!TOKEN) { showLogin(''); return; }
      var r = await api('/api/admin/me');
      if (r.ok) {
        ME = r.data.user;
        MUST_CHANGE = !!r.data.mustChangePassword;
        showApp();
      } else {
        showLogin('');
      }
    }

    async function doLogin() {
      $('loginErr').textContent = '';
      var r = await api('/api/admin/login', 'POST', {
        username: $('loginUser').value.trim(),
        password: $('loginPass').value
      });
      if (!r.ok) { $('loginErr').textContent = r.data.error || t('login_fail'); return; }
      TOKEN = r.data.token;
      store.set('admin_token', TOKEN);
      ME = r.data.user;
      MUST_CHANGE = !!r.data.mustChangePassword;
      $('loginPass').value = '';
      resetPwFields();
      showApp();
    }

    async function logout() {
      await api('/api/admin/logout', 'POST');
      forceLogout('');
    }

    async function logoutAll() {
      if (!(await askConfirm(t('logout_all_confirm'), true))) return;
      await api('/api/admin/logout-all', 'POST');
      forceLogout(t('logged_out_all'));
    }

    /* ---------- Navigation ---------- */

    function go(view) {
      VIEW = view;
      store.set('admin_view', view);
      document.querySelectorAll('.view').forEach(function (v) {
        v.classList.toggle('hidden', v.id !== 'v-' + view);
      });
      document.querySelectorAll('.nav-btn').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-view') === view);
      });
      if (view === 'dashboard') loadDashboard();
      if (view === 'orders') loadOrders(true);
      if (view === 'product') loadProduct();
      if (view === 'offers') loadOffers();
      if (view === 'inventory') loadInventory();
      if (view === 'admins') loadUsers();
      if (view === 'logs') loadLogs();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function refreshCurrent() {
      if (VIEW === 'dashboard') loadDashboard();
      else if (VIEW === 'orders') loadOrders(true);
      else if (VIEW === 'offers') loadOffers();
      else if (VIEW === 'inventory') loadInventory();
      else if (VIEW === 'admins') loadUsers();
      else if (VIEW === 'logs') loadLogs();
    }

    /* ---------- Pull-to-refresh & swipe ---------- */

    var TOUCH = null;

    function touchIgnored(target) {
      return !!(target.closest && target.closest('input, textarea, select, .table-wrap, .nav, .sheet, .topbar, .toasts, .thumbs'));
    }

    function showPtr(text) {
      var el = $('ptr');
      el.textContent = text;
      el.classList.add('show');
    }

    function hidePtr() { $('ptr').classList.remove('show'); }

    document.addEventListener('touchstart', function (e) {
      if (!TOKEN || $('modal').classList.contains('show')) { TOUCH = null; return; }
      var tp = e.touches[0];
      TOUCH = { x: tp.clientX, y: tp.clientY, atTop: window.scrollY <= 0, ignore: touchIgnored(e.target), pulled: 0 };
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!TOUCH || TOUCH.ignore) return;
      var tp = e.touches[0];
      var dy = tp.clientY - TOUCH.y;
      var dx = tp.clientX - TOUCH.x;
      if (TOUCH.atTop && dy > 60 && Math.abs(dx) < 50) {
        TOUCH.pulled = dy;
        showPtr(dy > 110 ? t('refreshing') : '↓');
      }
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (!TOUCH || TOUCH.ignore) { TOUCH = null; return; }
      var tp = e.changedTouches[0];
      var dx = tp.clientX - TOUCH.x;
      var dy = tp.clientY - TOUCH.y;

      if (TOUCH.pulled > 110 && Math.abs(dx) < 50) {
        showPtr(t('refreshing'));
        if (VIEW !== 'product') refreshCurrent();
        setTimeout(function () { showPtr(t('refreshed')); setTimeout(hidePtr, 900); }, 500);
      } else {
        hidePtr();
        if (Math.abs(dx) > 70 && Math.abs(dy) < 50) {
          var idx = VIEWS.indexOf(VIEW);
          var next = dx < 0 ? Math.min(VIEWS.length - 1, idx + 1) : Math.max(0, idx - 1);
          if (next !== idx) go(VIEWS[next]);
        }
      }
      TOUCH = null;
    }, { passive: true });

    /* ---------- Dashboard ---------- */

    async function loadDashboard() {
      var rs = await Promise.all([api('/api/admin/stats'), api('/api/admin/orders')]);
      var s = rs[0];
      var r = rs[1];
      if (s.ok) {
        STATS = s.data.stats || {};
        PRODUCT = s.data.product || PRODUCT;
        renderStats();
        renderBars();
        renderStock();
        renderDaily();
      }
      if (r.ok) {
        var recent = (r.data.orders || []).slice(0, 6);
        cacheOrders(recent);
        $('recentList').innerHTML = recent.length
          ? recent.map(orderCardHtml).join('')
          : '<div class="empty">' + esc(t('no_orders_yet')) + '</div>';
      }
    }

    function statCard(label, val, icon, color) {
      return '<div class="stat ' + color + '"><div class="sicon">' + icon + '</div><div>' +
        '<div class="sval">' + esc(val) + '</div><div class="slabel">' + esc(label) + '</div></div></div>';
    }

    function renderStats() {
      var s = STATS;
      $('statsGrid').innerHTML = [
        statCard(t('stat_total'), s.total || 0, '📦', 'blue'),
        statCard(t('stat_today'), s.today || 0, '🌅', 'green'),
        statCard(t('stat_pending'), s.pending || 0, '⏳', 'amber'),
        statCard(t('stat_revenue'), money(s.delivered_revenue), '💰', 'purple')
      ].join('');
    }

    function renderBars() {
      var total = Number(STATS.total) || 0;
      $('statusBars').innerHTML = STATUSES.map(function (st) {
        var count = Number(STATS[st.toLowerCase()]) || 0;
        var pct = total ? Math.round(count / total * 100) : 0;
        return '<div class="bar-row"><div class="bar-top"><span>' + esc(statusLabel(st)) + '</span><span>' + count + '</span></div>' +
          '<div class="bar"><span style="width:' + pct + '%"></span></div></div>';
      }).join('');
    }

    function renderStock() {
      var stock = Number(PRODUCT.stock) || 0;
      var low = stock <= LOW_STOCK_VIEW;
      var badge = low
        ? '<span class="badge s-Cancelled">' + esc(t('stock_low')) + '</span>'
        : '<span class="badge s-Delivered">' + esc(t('stock_ok')) + '</span>';
      $('stockBox').innerHTML =
        '<div class="kpi"><span>' + esc(t('name_label')) + '</span><strong>' + esc(PRODUCT.title || '—') + '</strong></div>' +
        '<div class="kpi"><span>' + esc(t('offer_price')) + '</span><strong>' + money(PRODUCT.price) + '</strong></div>' +
        '<div class="kpi"><span>' + esc(t('stock_label')) + '</span><strong>' + stock + ' ' + esc(t('qty_unit')) + ' ' + badge + '</strong></div>' +
        '<div class="kpi"><span>' + esc(statusLabel('Cancelled')) + '</span><strong>' + (STATS.cancelled || 0) + '</strong></div>';
    }

    function renderDaily() {
      var map = {};
      (STATS.daily || []).forEach(function (d) { map[d.d] = d; });
      var days = [];
      for (var i = 6; i >= 0; i--) {
        var key = new Date(Date.now() + 6 * 3600 * 1000 - i * 86400000).toISOString().slice(0, 10);
        var row = map[key] || {};
        days.push({ key: key, c: Number(row.c) || 0, t: Number(row.t) || 0 });
      }
      var max = Math.max.apply(null, days.map(function (d) { return d.c; })) || 1;
      $('dailyBox').innerHTML = '<div class="chart">' + days.map(function (d) {
        var h = Math.round(d.c / max * 100);
        return '<div class="col"><div class="cnt">' + d.c + '</div><div class="bar-v"><span style="height:' + h + '%"></span></div>' +
          '<div class="lbl">' + esc(d.key.slice(5)) + '</div><div class="sales">' + money(d.t) + '</div></div>';
      }).join('') + '</div>';
    }

    /* ---------- Orders ---------- */

    function orderCardHtml(o) {
      return '<div class="ocard" data-action="open-order" data-pid="' + esc(o.public_id) + '">' +
        '<div class="ohead"><span class="pid" data-action="copy" data-copy="' + esc(o.public_id) + '">' + esc(o.public_id) + '</span>' +
        '<span class="badge s-' + esc(o.status) + '">' + esc(statusLabel(o.status)) + '</span></div>' +
        '<div class="oname">' + esc(o.customer_name) + '</div>' +
        '<div class="ometa">📞 ' + esc(o.phone) + ' · ' + esc(o.delivery_area || '') + '</div>' +
        '<div class="ofoot"><strong>' + money(o.total) + '</strong><small>' + fmtDate(o.created_at) + '</small></div>' +
        '</div>';
    }

    async function loadOrders(reset) {
      var seq = ++REQ_SEQ;
      var offset = reset ? 0 : ORDERS.length;
      var q = encodeURIComponent($('oSearch').value.trim());
      var st = encodeURIComponent($('oStatus').value);
      var rg = encodeURIComponent($('oRange').value);
      var r = await api('/api/admin/orders?q=' + q + '&status=' + st + '&range=' + rg + '&offset=' + offset);
      if (seq !== REQ_SEQ) return;
      if (!r.ok) return;
      var list = r.data.orders || [];
      cacheOrders(list);
      ORDERS = reset ? list : ORDERS.concat(list);
      HAS_MORE = !!r.data.hasMore;
      renderOrders();
    }

    function renderOrders() {
      var countText = t('orders_count', { n: ORDERS.length }) + (HAS_MORE ? ' ' + t('more_avail') : '');
      $('oCount').textContent = countText;
      $('oList').innerHTML = ORDERS.length
        ? ORDERS.map(orderCardHtml).join('')
        : '<div class="empty">' + esc(t('no_orders')) + '</div>';
      $('oMore').classList.toggle('hidden', !HAS_MORE);
    }

    function linesText(o) {
      var lines = o.lines && o.lines.length ? o.lines : [{ color: o.selected_color, size: o.selected_size, qty: o.quantity }];
      return lines.map(function (l) {
        return (l.color || '-') + ' / ' + (l.size || '-') + ' × ' + l.qty;
      }).join('; ');
    }

    function openOrder(pid) {
      var o = CACHE[pid];
      if (!o) return;
      var phoneDigits = String(o.phone).replace(/[^0-9]/g, '');
      var waText = (LANG === 'bn'
        ? 'আসসালামু আলাইকুম, আপনার অর্ডার ' + pid + ' সম্পর্কে যোগাযোগ করছি।'
        : 'Hello, I am contacting you regarding your order ' + pid + '.');
      var wa = 'https://wa.me/88' + phoneDigits + '?text=' + encodeURIComponent(waText);
      var opts = STATUSES.map(function (s) {
        return '<option value="' + s + '"' + (s === o.status ? ' selected' : '') + '>' + esc(statusLabel(s)) + '</option>';
      }).join('');
      openModal(
        '<div class="mhead"><span class="pid">' + esc(pid) + '</span>' +
          '<span class="badge s-' + esc(o.status) + '">' + esc(statusLabel(o.status)) + '</span></div>' +
        '<h3>' + esc(o.customer_name) + '</h3>' +
        '<dl class="kv">' +
          '<dt>' + esc(t('d_phone')) + '</dt><dd>' + esc(o.phone) + '</dd>' +
          '<dt>' + esc(t('d_address')) + '</dt><dd>' + esc(o.address) + '</dd>' +
          '<dt>' + esc(t('d_area')) + '</dt><dd>' + esc(o.delivery_area) + '</dd>' +
          '<dt>' + esc(t('d_variant')) + '</dt><dd>' + esc(linesText(o)) + '</dd>' +
          '<dt>' + esc(t('d_qty')) + '</dt><dd>' + Number(o.quantity) + ' ' + esc(t('qty_unit')) + '</dd>' +
          (Number(o.bulk_discount) > 0 ? '<dt>' + esc(t('d_bulk')) + '</dt><dd>-' + money(o.bulk_discount) + '</dd>' : '') +
          (Number(o.coupon_discount) > 0 ? '<dt>' + esc(t('d_coupon')) + '</dt><dd>-' + money(o.coupon_discount) + ' (' + esc(o.coupon_code) + ')</dd>' : '') +
          '<dt>' + esc(t('d_delivery')) + '</dt><dd>' + money(o.delivery_charge) + '</dd>' +
          '<dt>' + esc(t('d_total')) + '</dt><dd><strong>' + money(o.total) + '</strong></dd>' +
          '<dt>' + esc(t('d_time')) + '</dt><dd>' + fmtDate(o.created_at) + '</dd>' +
        '</dl>' +
        '<label class="field"><span class="lbl">' + esc(t('d_status')) + '</span>' +
          '<select class="input" data-action="status" data-pid="' + esc(pid) + '">' + opts + '</select></label>' +
        '<label class="field"><span class="lbl">' + esc(t('note_label')) + '</span><textarea class="input" id="orderNote" rows="2">' + esc(o.note || '') + '</textarea></label>' +
        '<button class="btn ghost block" data-action="save-note" data-pid="' + esc(pid) + '">' + esc(t('note_save')) + '</button>' +
        '<div class="actions5">' +
          '<a class="btn call" href="tel:' + esc(o.phone) + '">' + esc(t('act_call')) + '</a>' +
          '<a class="btn wa" target="_blank" rel="noopener noreferrer" href="' + esc(wa) + '">' + esc(t('act_wa')) + '</a>' +
          '<button class="btn ghost" data-action="preview" data-pid="' + esc(pid) + '">' + esc(t('act_inv')) + '</button>' +
          '<button class="btn ghost" data-action="preview-pos" data-pid="' + esc(pid) + '">' + esc(t('act_pos')) + '</button>' +
          '<button class="btn ghost" data-action="copy" data-copy="' + esc(pid) + '">' + esc(t('act_copy')) + '</button>' +
        '</div>' +
        '<button class="btn danger block" data-action="delete-order" data-pid="' + esc(pid) + '">' + esc(t('delete_order')) + '</button>'
      );
    }

    async function updateStatus(pid, status) {
      var r = await api('/api/admin/order/status', 'POST', { publicId: pid, status: status });
      if (!r.ok) { toast(r.data.error || t('status_fail'), 'err'); openOrder(pid); return; }
      if (CACHE[pid]) CACHE[pid].status = status;
      toast(t('status_updated'), 'ok');
      refreshCurrent();
      openOrder(pid);
    }

    async function deleteOrder(pid) {
      if (!(await askConfirm(t('delete_confirm', { id: pid }), true))) return;
      var r = await api('/api/admin/order/delete', 'POST', { publicId: pid });
      if (!r.ok) { toast(r.data.error || t('status_fail'), 'err'); return; }
      delete CACHE[pid];
      closeModal();
      toast(t('deleted'), 'ok');
      refreshCurrent();
    }

    function copyText(text) {
      var done = function () { toast(t('copied', { id: text }), 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { toast(t('copy_fail'), 'err'); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { toast(t('copy_fail'), 'err'); }
        ta.remove();
      }
    }

    async function saveNote(pid) {
      var r = await api('/api/admin/order/note', 'POST', { publicId: pid, note: $('orderNote').value });
      if (r.ok) {
        if (CACHE[pid]) CACHE[pid].note = $('orderNote').value;
        toast(t('note_saved'), 'ok');
      } else {
        toast(r.data.error || t('status_fail'), 'err');
      }
    }

    /* ---------- Printer: invoice & POS documents ---------- */

    var PRINT = { invoice: null, pos: null };
    var PRINT_SAVED = null;
    var PRINT_TAB = 'invoice';

    var PRINT_THEMES = [
      { id: 'emerald', name: 'Emerald', primary: '#065f46', text: '#0f172a', bg: '#ffffff', line: '#cbd5e1', header: true, font: 'sans' },
      { id: 'ocean', name: 'Ocean', primary: '#0c4a6e', text: '#0f172a', bg: '#ffffff', line: '#bae6fd', header: true, font: 'sans' },
      { id: 'sunset', name: 'Sunset', primary: '#9a3412', text: '#1c1917', bg: '#fffbf5', line: '#fed7aa', header: true, font: 'serif' },
      { id: 'royal', name: 'Royal', primary: '#4c1d95', text: '#1e1b4b', bg: '#ffffff', line: '#ddd6fe', header: true, font: 'serif' },
      { id: 'rose', name: 'Rose', primary: '#9f1239', text: '#1f1f1f', bg: '#ffffff', line: '#fecdd3', header: true, font: 'sans' },
      { id: 'gold', name: 'Gold', primary: '#92400e', text: '#292524', bg: '#fffdf7', line: '#fde68a', header: false, font: 'serif' },
      { id: 'slate', name: 'Slate', primary: '#334155', text: '#0f172a', bg: '#f8fafc', line: '#e2e8f0', header: true, font: 'mono' },
      { id: 'forest', name: 'Forest', primary: '#14532d', text: '#14291b', bg: '#ffffff', line: '#bbf7d0', header: true, font: 'sans' },
      { id: 'minimal', name: 'Minimal', primary: '#111827', text: '#111827', bg: '#ffffff', line: '#d1d5db', header: false, font: 'sans' },
      { id: 'mono', name: 'Mono Classic', primary: '#000000', text: '#000000', bg: '#ffffff', line: '#000000', header: false, font: 'mono' }
    ];

    // POS/থার্মাল প্রিন্টারের জন্য আলাদা থিম (বেশিরভাগ থার্মাল প্রিন্টার কালো-সাদা)
    var POS_THEMES = [
      { id: 'p_classic', name: 'Classic Thermal', primary: '#000000', text: '#000000', bg: '#ffffff', line: '#000000', header: false, font: 'mono' },
      { id: 'p_inverse', name: 'Inverse Band', primary: '#000000', text: '#000000', bg: '#ffffff', line: '#000000', header: true, font: 'sans' },
      { id: 'p_bold', name: 'Bold Retail', primary: '#000000', text: '#000000', bg: '#ffffff', line: '#000000', header: true, font: 'display' },
      { id: 'p_dotted', name: 'Dotted Slip', primary: '#222222', text: '#222222', bg: '#ffffff', line: '#888888', header: false, font: 'mono' },
      { id: 'p_boxed', name: 'Boxed', primary: '#000000', text: '#000000', bg: '#ffffff', line: '#000000', header: false, font: 'sans' },
      { id: 'p_soft', name: 'Soft Grey', primary: '#374151', text: '#1f2937', bg: '#fafafa', line: '#d1d5db', header: false, font: 'sans' },
      { id: 'p_kitchen', name: 'Kitchen Ticket', primary: '#000000', text: '#000000', bg: '#ffffff', line: '#000000', header: true, font: 'display' },
      { id: 'p_serif', name: 'Serif Receipt', primary: '#000000', text: '#111111', bg: '#ffffff', line: '#000000', header: false, font: 'serif' },
      { id: 'p_compact', name: 'Compact Mono', primary: '#000000', text: '#000000', bg: '#ffffff', line: '#000000', header: false, font: 'mono' },
      { id: 'p_color', name: 'Colour Printer', primary: '#065f46', text: '#111111', bg: '#ffffff', line: '#a7f3d0', header: true, font: 'sans' }
    ];

    function themeList() { return PRINT_TAB === 'pos' ? POS_THEMES : PRINT_THEMES; }

    var PRINT_KEYS = ['num', 'customer', 'phone', 'address', 'area', 'product', 'color', 'size', 'qty', 'unit',
      'subtotal', 'bulk', 'coupon', 'delivery', 'status', 'payment', 'date', 'contact'];

    var PRINT_LABEL = {
      num: ['ক্রমিক (#)', 'Row number (#)'],
      customer: ['গ্রাহকের নাম', 'Customer name'], phone: ['ফোন', 'Phone'], address: ['ঠিকানা', 'Address'],
      area: ['ডেলিভারি এরিয়া', 'Delivery area'], product: ['প্রোডাক্ট', 'Product'], color: ['কালার', 'Color'],
      size: ['সাইজ', 'Size'], qty: ['পরিমাণ', 'Quantity'], unit: ['একক দাম', 'Unit price'],
      subtotal: ['সাবটোটাল', 'Subtotal'], bulk: ['বাল্ক ছাড়', 'Bulk discount'], coupon: ['কুপন ছাড়', 'Coupon discount'],
      delivery: ['ডেলিভারি চার্জ', 'Delivery charge'], status: ['স্ট্যাটাস', 'Status'], payment: ['পেমেন্ট', 'Payment'],
      date: ['তারিখ', 'Date'], contact: ['যোগাযোগ', 'Contact']
    };

    var PD_PAGE = { A4: [210, 'A4'], A5: [148, 'A5'], Letter: [216, 'letter'], '80mm': [80, '80mm auto'], '58mm': [58, '58mm auto'] };

    // সব selector একটি scope id-র ভেতরে থাকে, তাই দুটি preview একে অপরের স্টাইল বদলায় না
    function pdCss(c, sc) {
      var R = '#' + sc;
      var P = R + ' ';
      var pw = (PD_PAGE[c.page] || PD_PAGE.A4)[0];
      var fam = NF[c.font] || NF.sans;
      var band = c.header_bg;
      var fs = c.base;
      var pad = c.compact ? 2 : 4;
      var rad = Number(c.box_radius) || 0;
      return R + '{position:relative;overflow:hidden;font-family:' + fam + ';font-size:' + fs + 'px;font-weight:' + (Number(c.font_weight) || 400) +
        ';color:' + c.text + ';background:' + c.bg + ';padding:' + c.margin + 'mm;width:' + pw + 'mm;max-width:100%;margin:0 auto;box-sizing:border-box;line-height:' +
        ((Number(c.line_h) || 150) / 100) + ';text-align:' + (c.align || 'left') + '}' +
        P + 'p{margin:0 0 2px}' +
        P + '.pd-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;' +
          (band ? 'background:' + c.primary + ';color:#fff;padding:' + (pad + 8) + 'px 14px;border-radius:' + rad + 'px;' : 'padding-bottom:' + pad + 'px;') + '}' +
        P + '.pd-logo{display:block;max-width:' + c.logo_w + 'px;max-height:' + Math.round(c.logo_w * 0.8) + 'px;object-fit:contain;margin-bottom:4px}' +
        P + '.pd-brand{font-size:' + Math.round(fs * 1.6) + 'px;font-weight:900;letter-spacing:.5px;color:' + (band ? '#fff' : c.primary) + '}' +
        P + '.pd-tag{font-size:' + Math.round(fs * 0.9) + 'px;opacity:.85}' +
        P + '.pd-meta{font-size:' + Math.round(fs * 0.9) + 'px;text-align:right}' +
        P + '.pd-meta b{display:block;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:' + Math.round(fs * 1.05) + 'px}' +
        P + '.pd-line{border-top:1px dashed ' + c.line + ';margin:' + (pad + 4) + 'px 0}' +
        P + '.pd-box{border:1px solid ' + c.line + ';border-radius:' + rad + 'px;padding:' + (pad + 3) + 'px ' + (pad + 5) + 'px;margin:' + (pad + 4) + 'px 0}' +
        P + '.pd-box h4{font-size:' + Math.round(fs * 0.78) + 'px;text-transform:uppercase;letter-spacing:.6px;opacity:.65;margin:0 0 3px}' +
        P + 'table,' + P + 'th,' + P + 'td{font:inherit;color:inherit;text-transform:none;letter-spacing:normal;white-space:normal;text-align:left;background:none}' +
        P + '.pd-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:' + fs + 'px;margin:' + (pad + 4) + 'px 0}' +
        P + '.pd-table th{text-align:left;color:' + c.primary + ';font-weight:700;padding:' + pad + 'px 3px;border-bottom:1px solid ' + c.line + ';' +
          (c.head_upper ? 'text-transform:uppercase;letter-spacing:.4px;' : '') + '}' +
        P + '.pd-table td{padding:' + pad + 'px 3px;vertical-align:top;overflow-wrap:anywhere;word-break:break-word;border-bottom:1px dotted ' + c.line + '}' +
        (c.table_style === 'grid' ? P + '.pd-table th,' + P + '.pd-table td{border:1px solid ' + c.line + '}' : '') +
        (c.table_style === 'plain' ? P + '.pd-table td{border-bottom:none}' : '') +
        (c.table_style === 'zebra' ? P + '.pd-table tbody tr:nth-child(even) td{background:rgba(0,0,0,.04)}' : '') +
        P + '.pd-num{text-align:right}' +
        P + '.pd-tot div{display:flex;justify-content:space-between;gap:10px;padding:2px 0}' +
        P + '.pd-grand{border-top:2px solid ' + c.text + ';margin-top:4px;padding-top:4px;font-size:' + Math.round(fs * 1.25) + 'px;font-weight:900;color:' + c.primary + '}' +
        P + '.pd-pay{margin-top:8px;padding:' + (pad + 2) + 'px 8px;border:1px dashed ' + c.primary + ';border-radius:' + rad + 'px;color:' + c.primary + ';font-weight:700}' +
        P + '.pd-foot{text-align:center;margin-top:10px;font-size:' + Math.round(fs * 0.9) + 'px;opacity:.75}' +
        P + '.pd-items{margin:' + (pad + 4) + 'px 0}' +
        P + '.pd-item{border-bottom:1px dotted ' + c.line + ';padding:' + pad + 'px 0}' +
        P + '.pd-name{font-weight:700;overflow-wrap:anywhere;word-break:break-word;white-space:normal;line-height:1.35}' +
        P + '.pd-sub{display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;opacity:.9;margin-top:2px}' +
        P + '.pd-wm{position:absolute;top:38%;left:0;right:0;text-align:center;font-size:' + Math.round(fs * 3) + 'px;font-weight:900;opacity:.07;transform:rotate(-25deg);pointer-events:none;color:' + c.primary + ';white-space:nowrap}';
    }

    function pdBody(o, c) {
      var S = c.show || {};
      var qty = Number(o.quantity) || 1;
      var unit = Math.round((Number(o.subtotal) || 0) / qty) || Number(PRODUCT.price) || 0;
      var lines = o.lines && o.lines.length ? o.lines : [{ color: o.selected_color, size: o.selected_size, qty: o.quantity }];
      var rule = c.line_on ? '<div class="pd-line"></div>' : '';
      var wm = c.watermark ? '<div class="pd-wm">' + esc(c.watermark) + '</div>' : '';

      var head = '<div class="pd-head"><div>' +
        (c.logo ? '<img class="pd-logo" src="' + esc(c.logo) + '" alt="">' : '') +
        '<div class="pd-brand">' + esc(c.brand) + '</div>' +
        (c.tagline ? '<div class="pd-tag">' + esc(c.tagline) + '</div>' : '') + '</div>' +
        '<div class="pd-meta"><b>' + esc(o.public_id) + '</b>' +
        (S.date ? esc(t('inv_date')) + ': ' + fmtDate(o.created_at) + '<br>' : '') +
        (S.status ? esc(t('inv_status')) + ': ' + esc(statusLabel(o.status)) : '') + '</div></div>';

      var cust = [];
      if (S.customer) cust.push('<p><b>' + esc(o.customer_name) + '</b></p>');
      if (S.phone) cust.push('<p>' + esc(o.phone) + '</p>');
      if (S.address) cust.push('<p>' + esc(o.address) + '</p>');
      if (S.area) cust.push('<p>' + esc(o.delivery_area) + '</p>');
      var box = cust.length ? '<div class="pd-box"><h4>' + esc(t('inv_bill_to')) + '</h4>' + cust.join('') + '</div>' : '';

      // প্রতিটি আইটেম: 1. নাম (লম্বা হলে পরের লাইনে) / রঙ ও সাইজ — পরিমাণ × দাম = মোট
      var items = '<div class="pd-items">' + lines.map(function (l, i) {
        var lq = Number(l.qty) || 0;
        var variant = [S.color ? l.color : '', S.size ? l.size : ''].filter(function (x) { return x && x !== 'N/A'; }).map(esc).join(' / ');
        var qtyTxt = S.qty ? lq + ' ' + t('qty_unit') + (S.unit ? ' × ' + money(unit) : '') + ' =' : '';
        return '<div class="pd-item"><div class="pd-name">' + (S.num ? (i + 1) + '. ' : '') + esc(PRODUCT.title || '') + '</div>' +
          '<div class="pd-sub"><span>' + (variant || '&nbsp;') + '</span><span>' + qtyTxt + ' <b>' + money(unit * lq) + '</b></span></div></div>';
      }).join('') + '</div>';

      var tot = '';
      if (S.subtotal) tot += '<div><span>' + esc(t('inv_subtotal')) + '</span><span>' + money(o.subtotal) + '</span></div>';
      if (S.bulk && Number(o.bulk_discount) > 0) tot += '<div><span>' + esc(t('d_bulk')) + '</span><span>-' + money(o.bulk_discount) + '</span></div>';
      if (S.coupon && Number(o.coupon_discount) > 0) tot += '<div><span>' + esc(t('d_coupon')) + ' (' + esc(o.coupon_code) + ')</span><span>-' + money(o.coupon_discount) + '</span></div>';
      if (S.delivery) tot += '<div><span>' + esc(t('inv_delivery_charge')) + '</span><span>' + money(o.delivery_charge) + '</span></div>';
      tot += '<div class="pd-grand"><span>' + esc(t('inv_grand')) + '</span><span>' + money(o.total) + '</span></div>';
      var totals = '<div class="pd-tot">' + tot + '</div>';

      var pay = S.payment ? '<div class="pd-pay">💵 ' + esc(t('inv_cod')) + ' — ' + money(o.total) + '</div>' : '';
      var contact = c.contact || PRODUCT.contact_phone || '';
      var foot = '<div class="pd-foot">' + esc(LANG === 'bn' ? c.footer_bn : c.footer_en) +
        (S.contact && contact ? '<br>' + esc(t('inv_contact')) + ': ' + esc(contact) : '') + '</div>';

      return wm + head + rule + box + items + totals + pay + rule + foot;
    }

    function pdPreviewHtml(o, c, sc) {
      return '<style>' + pdCss(c, sc) + '</style><div id="' + sc + '">' + pdBody(o, c) + '</div>';
    }

    function pdFullDoc(o, c) {
      var pg = (PD_PAGE[c.page] || PD_PAGE.A4)[1];
      return '<!DOCTYPE html><html lang="' + LANG + '"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + esc(o.public_id) + '</title>' +
        '<style>@page{size:' + pg + ';margin:0}body{margin:0;background:#fff}' + pdCss(c, 'pvFull') + '</style></head>' +
        '<body><div id="pvFull">' + pdBody(o, c) + '</div></body></html>';
    }

    async function ensurePrint() {
      if (PRINT.invoice && PRINT.pos) return;
      var r = await api('/api/admin/print');
      if (r.ok) { PRINT = r.data.print; PRINT_SAVED = JSON.parse(JSON.stringify(PRINT)); }
    }

    function sampleOrder() {
      var k = Object.keys(CACHE)[0];
      if (k) return CACHE[k];
      return {
        public_id: 'NL-SAMPL-EXMPL', created_at: '2026-01-01 10:00:00', status: 'Confirmed',
        customer_name: 'রহিম উদ্দিন', phone: '01700000000', address: 'বাসা ১২, রোড ৫, ধানমন্ডি, ঢাকা',
        delivery_area: 'ঢাকার ভেতরে', quantity: 2, subtotal: 2980, bulk_discount: 0,
        coupon_discount: 298, coupon_code: 'SAMPLE10', delivery_charge: 60, total: 2742,
        selected_color: 'কালো', selected_size: 'M', lines: [{ color: 'কালো', size: 'M', qty: 2 }]
      };
    }

    async function previewDoc(pid, kind) {
      await ensurePrint();
      var o = CACHE[pid];
      if (!o) return;
      var c = PRINT[kind];
      openModal(
        '<h3>' + esc(kind === 'pos' ? t('act_pos') : t('inv_title')) + '</h3>' +
        pdPreviewHtml(o, c, 'pvModal') +
        '<div class="preview-bar">' +
          '<button class="btn" data-action="print" data-kind="' + kind + '" data-pid="' + esc(pid) + '">' + esc(t('pr_print')) + '</button>' +
          '<button class="btn ghost" data-action="download" data-kind="' + kind + '" data-pid="' + esc(pid) + '">' + esc(t('inv_download')) + '</button>' +
          '<button class="btn ghost" data-action="status-back" data-pid="' + esc(pid) + '">' + esc(t('inv_back')) + '</button>' +
        '</div>' +
        '<p class="hint-text">' + esc(t('save_pdf_hint')) + '</p>'
      );
    }

    async function printDoc(pid, kind) {
      await ensurePrint();
      var o = CACHE[pid];
      if (!o) return;
      var doc = pdFullDoc(o, PRINT[kind]);
      if (window.AndroidApp && window.AndroidApp.printHtml) { window.AndroidApp.printHtml(doc); return; }
      var w = window.open('', '_blank', 'width=480,height=680');
      if (!w) { toast(t('popup_block'), 'err'); downloadDoc(pid, kind); return; }
      w.document.open();
      w.document.write(doc);
      w.document.close();
      setTimeout(function () { w.focus(); w.print(); }, 450);
    }

    async function downloadDoc(pid, kind) {
      await ensurePrint();
      var o = CACHE[pid];
      if (!o) return;
      if (window.AndroidApp && window.AndroidApp.printHtml) { printDoc(pid, kind); return; }
      var blob = new Blob([pdFullDoc(o, PRINT[kind])], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = (kind === 'pos' ? 'pos-' : 'invoice-') + pid + '.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }

    function openPrinter(kind) {
      PRINT_TAB = kind === 'pos' ? 'pos' : 'invoice';
      closeModal();
      go('settings');
      if ($('printWrap').classList.contains('hidden')) togglePrinter();
      else loadSettings();
    }

    /* ---------- CSV (অর্ডার তালিকা, আইটেম সহ) ---------- */

    function exportCSV() {
      if (!ORDERS.length) { toast(t('csv_empty'), 'err'); return; }
      var headers = ['Order ID', 'Customer', 'Phone', 'Address', 'Items', 'Area', 'Qty', 'Subtotal', 'Bulk', 'Coupon', 'Delivery', 'Total COD', 'Status', 'Date'];
      var csvEsc = function (val) {
        var s = String(val == null ? '' : val).replace(/"/g, '""').replace(/[\\r\\n]+/g, ' ');
        if (/^[=+\\-@]/.test(s)) s = "'" + s;
        return '"' + s + '"';
      };
      var rows = ORDERS.map(function (o) {
        return [
          csvEsc(o.public_id), csvEsc(o.customer_name), csvEsc(o.phone), csvEsc(o.address), csvEsc(linesText(o)),
          csvEsc(o.delivery_area), csvEsc(o.quantity), csvEsc(o.subtotal), csvEsc(o.bulk_discount),
          csvEsc(o.coupon_discount), csvEsc(o.delivery_charge), csvEsc(o.total), csvEsc(o.status), csvEsc(o.created_at)
        ].join(',');
      });
      var content = '\\uFEFF' + [headers.join(',')].concat(rows).join('\\r\\n');
      var fileName = 'orders_' + new Date().toISOString().slice(0, 10) + '.csv';
      if (window.AndroidApp && window.AndroidApp.saveCsv) {
        window.AndroidApp.saveCsv(fileName, content);
        return;
      }
      var blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }

    /* ---------- Product ---------- */

    async function loadProduct() {
      var s = await api('/api/admin/stats');
      if (s.ok) PRODUCT = s.data.product || PRODUCT;
      fillProduct();
    }

    function fillProduct() {
      var p = PRODUCT || {};
      $('pTitle').value = p.title || '';
      $('pPrice').value = p.price == null ? '' : p.price;
      $('pOldPrice').value = p.old_price == null ? '' : p.old_price;
      $('pColors').value = p.colors || '';
      $('pSizes').value = p.sizes || '';
      $('pDelInside').value = p.delivery_inside == null ? 60 : p.delivery_inside;
      $('pDelOutside').value = p.delivery_outside == null ? 120 : p.delivery_outside;
      $('pPhone').value = p.contact_phone || '';
      $('pWhatsapp').value = p.whatsapp_number || '';
      $('pDesc').value = p.description || '';
      $('pRatio').value = p.image_ratio || 'auto';
      $('pActive').checked = p.active !== false;
      $('pBadge').value = p.badge_pos || 'tl';
      var tb = p.topbar || {};
      $('tbBn').value = tb.bn || TB_DEF.bn;
      $('tbEn').value = tb.en || TB_DEF.en;
      $('tbSize').value = tb.size == null ? 13 : tb.size;
      $('tbAlign').value = tb.align || 'center';
      $('tbOffset').value = tb.offset == null ? 0 : tb.offset;
      $('tbPad').value = tb.pad == null ? 10 : tb.pad;
      $('tbLangShow').checked = tb.langShow == null ? true : !!tb.langShow;
      $('tbLangSize').value = tb.langSize == null ? 12 : tb.langSize;
      renderTbPreview();
      IMAGES = (p.images || []).slice();
      TRUST = (p.trust || []).slice(0, 3);
      while (TRUST.length < 3) TRUST.push({ icon: '', bn: '', en: '' });
      FAQS = (p.faqs || []).slice(0, 10).map(function (f) { return Object.assign({}, DEFAULT_FAQ_BLANK, f); });
      NOTICES = (p.notices || []).slice(0, MAX_NOTICES).map(function (n) { return Object.assign({}, NOTICE_DEFAULT, n); });
      renderEditors();
    }

    function numIn(id, min, max, fallback) {
      var n = Math.trunc(Number($(id).value));
      if (!isFinite(n) || $(id).value === '') n = fallback;
      return Math.max(min, Math.min(max, n));
    }

    function tbValues() {
      return {
        bn: $('tbBn').value,
        en: $('tbEn').value,
        size: numIn('tbSize', 9, 32, 13),
        align: $('tbAlign').value,
        offset: numIn('tbOffset', -120, 120, 0),
        pad: numIn('tbPad', 0, 40, 10),
        langShow: $('tbLangShow').checked,
        langSize: numIn('tbLangSize', 8, 28, 12)
      };
    }

    function renderTbPreview() {
      if (!$('tbPreview')) return;
      var v = tbValues();
      var txt = LANG === 'bn' ? (v.bn || v.en) : (v.en || v.bn);
      var box = $('tbPreview');
      var el = $('tbPreviewText');
      box.style.paddingTop = v.pad + 'px';
      box.style.paddingBottom = v.pad + 'px';
      el.textContent = txt;
      el.style.fontSize = v.size + 'px';
      el.style.textAlign = v.align;
      el.style.transform = 'translateX(' + v.offset + 'px)';
    }

    function resetTopbar() {
      $('tbBn').value = TB_DEF.bn;
      $('tbEn').value = TB_DEF.en;
      $('tbSize').value = 13;
      $('tbAlign').value = 'center';
      $('tbOffset').value = 0;
      $('tbPad').value = 10;
      $('tbLangShow').checked = true;
      $('tbLangSize').value = 12;
      renderTbPreview();
    }

    function renderEditors() {
      renderImagePreviews();
      renderTrustEditor();
      renderNotices();
      renderFaqEditor();
    }

    function renderTrustEditor() {
      $('trustEditor').innerHTML = TRUST.map(function (it, i) {
        return '<div class="ed-row">' +
          '<input class="input emoji" data-kind="trust" data-idx="' + i + '" data-field="icon" value="' + esc(it.icon) + '" maxlength="8" aria-label="' + esc(t('icon_label')) + '">' +
          '<input class="input grow" data-kind="trust" data-idx="' + i + '" data-field="bn" value="' + esc(it.bn) + '" placeholder="বাংলা">' +
          '<input class="input grow" data-kind="trust" data-idx="' + i + '" data-field="en" value="' + esc(it.en) + '" placeholder="English">' +
          '</div>';
      }).join('');
    }

    function renderFaqEditor() {
      $('faqEditor').innerHTML = FAQS.length ? FAQS.map(function (f, i) {
        return '<div class="ed-faq">' +
          '<div class="head"><span>#' + (i + 1) + '</span>' +
          '<button class="btn sm danger" data-action="faq-del" data-idx="' + i + '">' + esc(t('faq_del')) + '</button></div>' +
          '<div class="grid-2">' +
            '<div class="field"><label>' + esc(t('faq_q_bn')) + '</label><input class="input" data-kind="faq" data-idx="' + i + '" data-field="qbn" value="' + esc(f.qbn) + '"></div>' +
            '<div class="field"><label>' + esc(t('faq_q_en')) + '</label><input class="input" data-kind="faq" data-idx="' + i + '" data-field="qen" value="' + esc(f.qen) + '"></div>' +
            '<div class="field"><label>' + esc(t('faq_a_bn')) + '</label><textarea class="input" rows="2" data-kind="faq" data-idx="' + i + '" data-field="abn">' + esc(f.abn) + '</textarea></div>' +
            '<div class="field"><label>' + esc(t('faq_a_en')) + '</label><textarea class="input" rows="2" data-kind="faq" data-idx="' + i + '" data-field="aen">' + esc(f.aen) + '</textarea></div>' +
          '</div></div>';
      }).join('') : '<div class="empty">' + esc(t('faq_max', { n: 10 })) + '</div>';
    }

    /* ---------- Notices (FAQ-এর উপরে কাস্টম ব্লক) ---------- */

    function noticeEditorHtml(n, i) {
      var opts = function (list, cur) {
        return list.map(function (pair) {
          return '<option value="' + pair[0] + '"' + (pair[0] === cur ? ' selected' : '') + '>' + esc(t(pair[1])) + '</option>';
        }).join('');
      };
      var fontOpts = opts([['sans', 'nt_f_sans'], ['serif', 'nt_f_serif'], ['mono', 'nt_f_mono'], ['display', 'nt_f_display']], n.font);
      var alignOpts = opts([['left', 'tb_left'], ['center', 'tb_center'], ['right', 'tb_right']], n.align);
      var bgNone = !n.bg;
      return '<div class="ed-faq nt-block" data-nidx="' + i + '">' +
        '<div class="head"><span>' + esc(t('nt_block', { n: i + 1 })) + '</span>' +
          '<button class="btn sm danger" data-action="notice-del" data-idx="' + i + '">' + esc(t('nt_del')) + '</button></div>' +
        '<label class="chk"><input type="checkbox" data-nkind="f" data-field="on" data-idx="' + i + '"' + (n.on !== false ? ' checked' : '') + '> <span>' + esc(t('nt_on')) + '</span></label>' +
        '<div class="grid-2" style="margin-top:10px;">' +
          '<div class="field"><label>' + esc(t('nt_head_bn')) + '</label><input class="input" data-nkind="f" data-field="head_bn" data-idx="' + i + '" value="' + esc(n.head_bn) + '"></div>' +
          '<div class="field"><label>' + esc(t('nt_head_en')) + '</label><input class="input" data-nkind="f" data-field="head_en" data-idx="' + i + '" value="' + esc(n.head_en) + '"></div>' +
          '<div class="field"><label>' + esc(t('nt_body_bn')) + '</label><textarea class="input" rows="3" data-nkind="f" data-field="body_bn" data-idx="' + i + '">' + esc(n.body_bn) + '</textarea></div>' +
          '<div class="field"><label>' + esc(t('nt_body_en')) + '</label><textarea class="input" rows="3" data-nkind="f" data-field="body_en" data-idx="' + i + '">' + esc(n.body_en) + '</textarea></div>' +
        '</div>' +
        '<div class="grid-4">' +
          '<div class="field"><label>' + esc(t('nt_font')) + '</label><select class="input" data-nkind="f" data-field="font" data-idx="' + i + '">' + fontOpts + '</select></div>' +
          '<div class="field"><label>' + esc(t('nt_align')) + '</label><select class="input" data-nkind="f" data-field="align" data-idx="' + i + '">' + alignOpts + '</select></div>' +
          '<div class="field"><label>' + esc(t('nt_head_size')) + '</label><input class="input" type="number" min="12" max="40" data-nkind="f" data-field="head_size" data-idx="' + i + '" value="' + n.head_size + '"></div>' +
          '<div class="field"><label>' + esc(t('nt_body_size')) + '</label><input class="input" type="number" min="10" max="24" data-nkind="f" data-field="body_size" data-idx="' + i + '" value="' + n.body_size + '"></div>' +
        '</div>' +
        '<div class="grid-4">' +
          '<div class="field"><label>' + esc(t('nt_head_color')) + '</label><input class="input" type="color" data-nkind="f" data-field="head_color" data-idx="' + i + '" value="' + n.head_color + '"></div>' +
          '<div class="field"><label>' + esc(t('nt_body_color')) + '</label><input class="input" type="color" data-nkind="f" data-field="body_color" data-idx="' + i + '" value="' + n.body_color + '"></div>' +
          '<div class="field"><label>' + esc(t('nt_bg')) + '</label><input class="input" type="color" data-nkind="f" data-field="bg" data-idx="' + i + '" value="' + (n.bg || '#ffffff') + '"' + (bgNone ? ' disabled' : '') + '></div>' +
          '<div class="field"><label class="chk"><input type="checkbox" data-nkind="f" data-field="bgnone" data-idx="' + i + '"' + (bgNone ? ' checked' : '') + '> <span>' + esc(t('nt_bg_none')) + '</span></label>' +
            '<label class="chk"><input type="checkbox" data-nkind="f" data-field="bold" data-idx="' + i + '"' + (n.bold ? ' checked' : '') + '> <span>' + esc(t('nt_bold')) + '</span></label></div>' +
        '</div>' +
        '<div class="field"><label>' + esc(t('nt_img')) + '</label>' +
          '<div class="nt-img-row">' +
            '<input class="input" type="file" accept="image/*" data-nkind="file" data-idx="' + i + '">' +
            '<input class="input" data-nkind="url" data-idx="' + i + '" placeholder="' + esc(t('nt_img_url')) + '">' +
            (n.image ? '<button class="btn sm ghost" data-action="notice-img-del" data-idx="' + i + '">' + esc(t('nt_img_remove')) + '</button>' : '') +
          '</div></div>' +
        '<div class="nt-prev" id="ntPrev' + i + '"></div>' +
        '</div>';
    }

    function renderNotices() {
      $('noticeEditor').innerHTML = NOTICES.length
        ? NOTICES.map(noticeEditorHtml).join('')
        : '<div class="empty">' + esc(t('nt_empty')) + '</div>';
      NOTICES.forEach(function (_, i) { updateNoticePreview(i); });
    }

    function noticeClientHtml(n) {
      var pick = function (bn, en) { return LANG === 'bn' ? (bn || en) : (en || bn); };
      var head = pick(n.head_bn, n.head_en);
      var body = pick(n.body_bn, n.body_en);
      var style = 'font-family:' + (NF[n.font] || NF.sans) + ';text-align:' + (n.align || 'left') + ';' + (n.bg ? 'background:' + n.bg + ';' : '');
      return '<section class="notice" style="' + style + '">' +
        (n.image ? '<img class="notice-img" src="' + esc(n.image) + '" alt="">' : '') +
        (head ? '<h3 class="notice-h" style="font-size:' + n.head_size + 'px;color:' + n.head_color + ';font-weight:' + (n.bold ? 800 : 600) + '">' + esc(head) + '</h3>' : '') +
        (body ? '<div class="notice-b" style="font-size:' + n.body_size + 'px;color:' + n.body_color + '">' + esc(body) + '</div>' : '') +
        '</section>';
    }

    function updateNoticePreview(i) {
      var el = $('ntPrev' + i);
      if (!el || !NOTICES[i]) return;
      var n = NOTICES[i];
      el.innerHTML = (n.head_bn || n.head_en || n.body_bn || n.body_en || n.image)
        ? noticeClientHtml(n)
        : '<div class="muted" style="padding:10px">' + esc(t('nt_preview')) + '</div>';
    }

    function onNoticeInput(el) {
      var idx = Number(el.getAttribute('data-idx'));
      var n = NOTICES[idx];
      if (!n) return;
      var f = el.getAttribute('data-field');
      if (f === 'bgnone') {
        var blk = el.closest('.nt-block');
        var col = blk.querySelector('[data-field="bg"]');
        n.bg = el.checked ? '' : col.value;
        col.disabled = el.checked;
      } else if (f === 'bg') {
        n.bg = el.value;
      } else if (el.type === 'checkbox') {
        n[f] = el.checked;
      } else if (el.type === 'number') {
        n[f] = Number(el.value) || 0;
      } else {
        n[f] = el.value;
      }
      updateNoticePreview(idx);
    }

    // ছবি নির্বাচিত অনুপাতে কেটে বা আসল অনুপাতে ছোট করে JPEG বানানো
    function shrinkImage(file, maxSide, quality) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('read')); };
        reader.onload = function (evt) {
          var img = new Image();
          img.onerror = function () { reject(new Error('decode')); };
          img.onload = function () {
            var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            var w = Math.round(img.width * scale);
            var h = Math.round(img.height * scale);
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function cropImage(file, ratioStr) {
      var parts = String(ratioStr || '1:1').split(':');
      var rw = Number(parts[0]) || 1;
      var rh = Number(parts[1]) || 1;
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('read')); };
        reader.onload = function (evt) {
          var img = new Image();
          img.onerror = function () { reject(new Error('decode')); };
          img.onload = function () {
            var target = rw / rh;
            var sw = img.width, sh = img.height, sx = 0, sy = 0;
            if (sw / sh > target) { sx = (sw - sh * target) / 2; sw = sh * target; }
            else { sy = (sh - sw / target) / 2; sh = sw / target; }
            var outW = 720;
            var outH = Math.round(outW * rh / rw);
            var canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, outW, outH);
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
            resolve(canvas.toDataURL('image/jpeg', 0.78));
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function compressImage(file, ratioStr) {
      return ratioStr === 'auto' ? shrinkImage(file, 800, 0.8) : cropImage(file, ratioStr);
    }

    async function handleNoticeFile(idx, file) {
      try {
        var data = await shrinkImage(file, 640, 0.75);
        if (data.length > 300 * 1024) { toast(t('nt_too_big'), 'err'); return; }
        NOTICES[idx].image = data;
        renderNotices();
      } catch (err) {
        toast(t('img_fail', { name: file.name }), 'err');
      }
    }

    function addUrlImage() {
      var val = $('pImgUrl').value.trim();
      if (!val) return;
      if (IMAGES.length >= MAX_IMAGES) { toast(t('max_images', { n: MAX_IMAGES }), 'err'); return; }
      IMAGES.push(val);
      $('pImgUrl').value = '';
      renderImagePreviews();
    }

    function renderImagePreviews() {
      $('imgPreviewList').innerHTML = IMAGES.map(function (src, idx) {
        return '<div class="img-card"><img src="' + esc(src) + '" alt="">' +
          '<button type="button" data-action="remove-img" data-idx="' + idx + '">✕</button></div>';
      }).join('');
    }

    async function handleImages(e) {
      var files = Array.from(e.target.files || []);
      e.target.value = '';
      var ratio = $('pRatio').value;
      for (var i = 0; i < files.length; i++) {
        if (IMAGES.length >= MAX_IMAGES) { toast(t('max_images', { n: MAX_IMAGES }), 'err'); break; }
        try { IMAGES.push(await compressImage(files[i], ratio)); }
        catch (err) { toast(t('img_fail', { name: files[i].name }), 'err'); }
      }
      renderImagePreviews();
    }

    function collectTrust() {
      return TRUST.map(function (x) {
        return { icon: x.icon || '', bn: x.bn || '', en: x.en || '' };
      });
    }

    async function saveProduct() {
      if (IMAGES.length === 0) { setMsg('productMsg', t('need_image'), false); return; }
      var btn = $('saveBtn');
      btn.disabled = true;
      btn.textContent = t('saving');
      var tb = tbValues();
      var r = await api('/api/admin/product', 'POST', {
        title: $('pTitle').value,
        price: $('pPrice').value,
        old_price: $('pOldPrice').value,
        colors: $('pColors').value.trim(),
        sizes: $('pSizes').value.trim(),
        delivery_inside: $('pDelInside').value,
        delivery_outside: $('pDelOutside').value,
        contact_phone: $('pPhone').value.trim(),
        whatsapp_number: $('pWhatsapp').value.trim(),
        images: IMAGES,
        description: $('pDesc').value,
        image_ratio: $('pRatio').value,
        badge_pos: $('pBadge').value,
        trust: collectTrust(),
        faqs: FAQS,
        notices: NOTICES,
        topbar_bn: tb.bn,
        topbar_en: tb.en,
        topbar_size: tb.size,
        topbar_align: tb.align,
        topbar_offset: tb.offset,
        topbar_pad: tb.pad,
        topbar_lang_show: tb.langShow,
        topbar_lang_size: tb.langSize,
        is_active: $('pActive').checked
      });
      btn.disabled = false;
      btn.textContent = t('save_all');
      if (r.ok) { setMsg('productMsg', t('saved_ok'), true); toast(t('saved_toast'), 'ok'); }
      else setMsg('productMsg', r.data.error || t('status_fail'), false);
    }

    /* ---------- Offers & coupons (pro) ---------- */

    var OFFERS = { bulk: null, coupons: [], notes: {}, personal: [], rewardRules: 0, totals: {} };
    var CP_FILTER = { q: '', s: 'all' };
    var RW_Q = '';
    var RW_F = 'all';

    async function loadOffers() {
      var rs = await Promise.all([api('/api/admin/offers'), api('/api/admin/rewards')]);
      var r = rs[0];
      var p = rs[1];
      if (!r.ok) return;
      OFFERS = {
        bulk: r.data.bulk,
        coupons: r.data.coupons || [],
        notes: r.data.notes || {},
        rewardRules: r.data.rewardRules || 0,
        totals: r.data.totals || {},
        giveaway: r.data.giveaway || {},
        rewards: p.ok ? (p.data.rewards || []) : []
      };
      renderOffStats();
      renderBulkForm();
      renderNotesForm();
      renderGiveaway();
      renderCouponChips();
      renderCoupons();
      renderRewardChips();
      renderRewards();
    }

    function renderGiveaway() {
      var g = OFFERS.giveaway || {};
      var left = g.expires_at ? Math.max(1, Math.ceil((new Date(g.expires_at).getTime() - Date.now()) / 86400000)) : '';
      $('gvCode').value = g.code || '';
      $('gvPct').value = g.percent || 10;
      $('gvDays').value = left;
      $('gvBn').value = g.bn || '';
      $('gvEn').value = g.en || '';
      var tg = $('gvToggle');
      tg.textContent = g.enabled ? t('gv_state_on') : t('gv_state_off');
      tg.className = 'btn sm' + (g.enabled ? '' : ' ghost');
    }

    // 🎲 কোড তৈরি: একবারে কোড + কুপন তৈরি ও সেভ হয়ে যায়
    async function generateGiveCode() {
      var r = await api('/api/admin/giveaway/generate', 'POST', {
        percent: Number($('gvPct').value),
        expiry_days: Number($('gvDays').value) || 0
      });
      if (r.ok) { toast(t('gv_generated') + ': ' + r.data.code, 'ok'); loadOffers(); }
      else toast(r.data.error || t('status_fail'), 'err');
    }

    async function saveGiveaway() {
      var r = await api('/api/admin/giveaway', 'POST', {
        code: $('gvCode').value.trim(),
        percent: Number($('gvPct').value),
        expiry_days: Number($('gvDays').value) || 0,
        bn: $('gvBn').value,
        en: $('gvEn').value
      });
      if (r.ok) { setMsg('gvMsg', t('gv_saved'), true); toast(t('gv_saved'), 'ok'); loadOffers(); }
      else setMsg('gvMsg', r.data.error || t('status_fail'), false);
    }

    // on/off আলাদা বাটন: সেভ না করেই চালু/বন্ধ হয়
    async function toggleGiveaway() {
      var g = OFFERS.giveaway || {};
      var r = await api('/api/admin/giveaway/toggle', 'POST', { enabled: !g.enabled });
      if (r.ok) { toast(t('gv_toggled'), 'ok'); loadOffers(); }
      else toast(r.data.error || t('status_fail'), 'err');
    }

    function couponStatus(c) {
      if (!Number(c.active)) return 'inactive';
      if (c.expires_at && new Date(c.expires_at).getTime() <= Date.now()) return 'expired';
      if (Number(c.max_uses) > 0 && Number(c.uses) >= Number(c.max_uses)) return 'used';
      return 'active';
    }

    function renderOffStats() {
      var pub = OFFERS.coupons.filter(function (c) { return !Number(c.is_personal); });
      var active = pub.filter(function (c) { return couponStatus(c) === 'active'; }).length;
      var uses = pub.reduce(function (s, c) { return s + (Number(c.uses) || 0); }, 0);
      var tot = OFFERS.totals || {};
      $('offStats').innerHTML = [
        statCard(t('off_stat_active'), active, '🎟️', 'green'),
        statCard(t('off_stat_uses'), uses, '🔁', 'blue'),
        statCard(t('off_stat_cdisc'), money(tot.coupon_total), '💸', 'amber'),
        statCard(t('off_stat_bdisc'), money(tot.bulk_total), '📦', 'purple')
      ].join('');
    }

    function renderNotesForm() {
      var n = OFFERS.notes || {};
      $('ntBulkBn').value = n.note_bulk_bn || '';
      $('ntBulkEn').value = n.note_bulk_en || '';
      $('ntCouponBn').value = n.note_coupon_bn || '';
      $('ntCouponEn').value = n.note_coupon_en || '';
      $('ntBulkOn').checked = n.note_bulk_on !== '0';
      $('ntCouponOn').checked = n.note_coupon_on !== '0';
    }

    async function saveNotes() {
      var r = await api('/api/admin/notes', 'POST', {
        note_bulk_bn: $('ntBulkBn').value,
        note_bulk_en: $('ntBulkEn').value,
        note_coupon_bn: $('ntCouponBn').value,
        note_coupon_en: $('ntCouponEn').value,
        note_bulk_on: $('ntBulkOn').checked,
        note_coupon_on: $('ntCouponOn').checked
      });
      if (r.ok) { setMsg('ntMsg', t('notes_saved'), true); toast(t('notes_saved'), 'ok'); loadOffers(); }
      else setMsg('ntMsg', r.data.error || t('status_fail'), false);
    }

    function renderBulkForm() {
      var b = OFFERS.bulk || {};
      $('bkOn').checked = !!b.enabled;
      $('bkMin').value = b.min || 2;
      $('bkType').value = b.type || 'percent';
      $('bkVal').value = b.value || 0;
    }

    async function saveBulk() {
      var r = await api('/api/admin/offers/bulk', 'POST', {
        enabled: $('bkOn').checked,
        min_qty: Number($('bkMin').value) || 2,
        type: $('bkType').value,
        value: Number($('bkVal').value) || 0
      });
      if (r.ok) { setMsg('bkMsg', t('bulk_saved'), true); toast(t('bulk_saved'), 'ok'); loadOffers(); }
      else setMsg('bkMsg', r.data.error || t('status_fail'), false);
    }

    function randomFrom(chars, n) {
      var bytes = new Uint8Array(n);
      crypto.getRandomValues(bytes);
      var s = '';
      for (var i = 0; i < n; i++) s += chars[bytes[i] % chars.length];
      return s;
    }

    var ENGINES = {
      alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      readable: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
      letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      digits: '0123456789'
    };

    // আপনার দেওয়া শব্দ + বাছাই করা ধরনের এলোমেলো অংশ দিয়ে কোড
    function generateCouponCode() {
      var words = $('cpWords').value.split(',').map(function (w) {
        return w.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      }).filter(Boolean);
      var n = Math.max(2, Math.min(10, Number($('cpSuffix').value) || 4));
      var chars = ENGINES[$('cpEngine').value] || ENGINES.readable;
      var suffix = randomFrom(chars, n);
      var word = words.length ? words[Math.floor(Math.random() * words.length)] : '';
      $('cpCode').value = (word ? word + '-' : '') + suffix;
    }

    async function createCoupon() {
      var r = await api('/api/admin/coupons', 'POST', {
        code: $('cpCode').value.trim(),
        percent: Number($('cpPct').value),
        max_uses: Number($('cpMax').value) || 0,
        expiry_days: Number($('cpExpDays').value) || 0,
        reward_rule: $('cpRule').value,
        active: $('cpActive').checked
      });
      if (r.ok) {
        setMsg('cpMsg', t('cp_created') + ': ' + r.data.code, true);
        $('cpCode').value = '';
        loadOffers();
      } else {
        setMsg('cpMsg', r.data.error || t('status_fail'), false);
      }
    }

    function ruleLabel(r) {
      return r === 'every' ? t('cp_r_every') : (r === 'first' ? t('cp_r_first') : t('cp_r_none'));
    }

    function leftText(iso) {
      if (!iso) return t('cp_never');
      var diff = new Date(iso).getTime() - Date.now();
      if (diff <= 0) return t('cp_expired');
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      if (d >= 1) return t('cp_left_days', { d: d, h: h });
      if (h >= 1) return t('cp_left_hours', { h: h, m: m });
      return t('cp_left_min', { m: m });
    }

    function tickCountdowns() {
      document.querySelectorAll('.cd').forEach(function (el) {
        var iso = el.getAttribute('data-exp');
        el.textContent = leftText(iso);
        el.classList.toggle('expired', !!iso && new Date(iso).getTime() <= Date.now());
      });
    }

    function couponRowHtml(c) {
      var st = couponStatus(c);
      var on = Number(c.active);
      var usage = Number(c.uses) + ' / ' + (Number(c.max_uses) > 0 ? Number(c.max_uses) : t('cp_unlimited'));
      return '<tr><td><span class="pid" data-action="copy" data-copy="' + esc(c.code) + '">' + esc(c.code) + '</span></td>' +
        '<td>' + Number(c.percent) + '%</td>' +
        '<td>' + esc(usage) + '</td>' +
        '<td><span class="cd" data-exp="' + esc(c.expires_at || '') + '"></span></td>' +
        '<td><span class="badge ' + (st === 'active' ? 's-Delivered' : 's-Cancelled') + '">' + esc(t('cp_f_' + st)) + '</span></td>' +
        '<td>' + esc(ruleLabel(c.reward_rule)) + '</td>' +
        '<td><div class="row">' +
          '<button class="btn sm ghost" data-action="cp-share" data-code="' + esc(c.code) + '" data-p="' + Number(c.percent) + '">' + esc(t('cp_share')) + '</button>' +
          '<button class="btn sm ' + (on ? '' : 'ghost') + '" data-action="coupon-toggle" data-id="' + Number(c.id) + '" data-on="' + (on ? 0 : 1) + '">' + esc(on ? t('cp_on') : t('cp_off')) + '</button>' +
          '<button class="btn sm danger" data-action="coupon-del" data-id="' + Number(c.id) + '" data-code="' + esc(c.code) + '">' + esc(t('delete')) + '</button>' +
        '</div></td></tr>';
    }

    function renderCouponChips() {
      var pub = OFFERS.coupons.filter(function (c) { return !Number(c.is_personal); });
      var counts = { all: pub.length };
      pub.forEach(function (c) { var s = couponStatus(c); counts[s] = (counts[s] || 0) + 1; });
      var keys = ['all', 'active', 'inactive', 'expired', 'used'];
      $('cpChips').innerHTML = keys.map(function (k) {
        return '<button type="button" class="chip' + (CP_FILTER.s === k ? ' on' : '') + '" data-action="cp-filter" data-v="' + k + '">' +
          esc(t('cp_f_' + k)) + ' <b>' + (counts[k] || 0) + '</b></button>';
      }).join('');
    }

    function renderCoupons() {
      var q = CP_FILTER.q.toUpperCase();
      var list = OFFERS.coupons.filter(function (c) {
        if (Number(c.is_personal)) return false;
        if (CP_FILTER.s !== 'all' && couponStatus(c) !== CP_FILTER.s) return false;
        return !q || String(c.code).toUpperCase().indexOf(q) >= 0;
      });
      $('cpList').innerHTML = list.length
        ? '<table><thead><tr><th>' + esc(t('cp_code')) + '</th><th>%</th><th>' + esc(t('cp_max')) + '</th><th>' +
          esc(t('cp_expiry')) + '</th><th>' + esc(t('cp_f_all')) + '</th><th>' + esc(t('cp_reward')) + '</th><th></th></tr></thead><tbody>' +
          list.map(couponRowHtml).join('') + '</tbody></table>'
        : '<div class="empty">' + esc(t('cp_none')) + '</div>';
      tickCountdowns();
    }

    function rewardStatus(r) {
      if (!Number(r.active)) return 'inactive';
      if (r.expires_at && new Date(r.expires_at).getTime() <= Date.now()) return 'expired';
      if (Number(r.uses) >= Math.max(1, Number(r.max_uses) || 1)) return 'used';
      return 'unused';
    }

    function rewardLabel(s) {
      var keys = { unused: 'cp_unused', used: 'cp_used', expired: 'cp_f_expired', inactive: 'cp_f_inactive' };
      return t(keys[s] || 'cp_unused');
    }

    function setRwFilter(v) {
      RW_F = v;
      renderRewardChips();
      renderRewards();
    }

    function renderRewardChips() {
      var list = OFFERS.rewards || [];
      var counts = { all: list.length };
      list.forEach(function (r) { var s = rewardStatus(r); counts[s] = (counts[s] || 0) + 1; });
      var labels = { all: 'cp_f_all', unused: 'cp_unused', used: 'cp_used', expired: 'cp_f_expired', inactive: 'cp_f_inactive' };
      $('rwChips').innerHTML = ['all', 'unused', 'used', 'expired', 'inactive'].map(function (k) {
        return '<button type="button" class="chip' + (RW_F === k ? ' on' : '') + '" data-action="rw-filter" data-v="' + k + '">' +
          esc(t(labels[k])) + ' <b>' + (counts[k] || 0) + '</b></button>';
      }).join('');
    }

    function rewardRowHtml(r) {
      var st = rewardStatus(r);
      var from = r.issued_order
        ? '<span class="pid">' + esc(r.issued_order) + '</span><div class="muted">' + esc(r.issued_name || '') + '</div>'
        : '<span class="muted">—</span>';
      var used = r.used_order
        ? '<span class="pid">' + esc(r.used_order) + '</span><div class="muted">' + esc(r.used_name || '') + '</div>'
        : '<span class="muted">—</span>';
      return '<tr><td><span class="pid" data-action="copy" data-copy="' + esc(r.code) + '">' + esc(r.code) + '</span></td>' +
        '<td>' + Number(r.percent) + '%</td>' +
        '<td>' + from + '</td>' +
        '<td><span class="badge ' + (st === 'used' ? 's-Delivered' : (st === 'unused' ? 's-Pending' : 's-Cancelled')) + '">' + esc(rewardLabel(st)) + '</span></td>' +
        '<td>' + used + '</td>' +
        '<td>' + (r.used_at ? fmtDate(r.used_at) : '—') + '</td>' +
        '<td><span class="cd" data-exp="' + esc(r.expires_at || '') + '"></span></td>' +
        '<td><button class="btn sm danger" data-action="coupon-del" data-id="' + Number(r.id) + '" data-code="' + esc(r.code) + '">' + esc(t('delete')) + '</button></td></tr>';
    }

    function renderRewards() {
      var q = RW_Q.toUpperCase();
      var list = (OFFERS.rewards || []).filter(function (r) {
        if (RW_F !== 'all' && rewardStatus(r) !== RW_F) return false;
        var hay = [r.code, r.issued_order, r.used_order, r.issued_name, r.used_name].join(' ').toUpperCase();
        return !q || hay.indexOf(q) >= 0;
      });
      $('cpPersonalInfo').textContent = OFFERS.rewardRules ? t('cp_templates', { n: OFFERS.rewardRules }) : t('cp_no_templates');
      $('cpPersonal').innerHTML = list.length
        ? '<table><thead><tr><th>' + esc(t('cp_code')) + '</th><th>%</th><th>' + esc(t('rh_from')) + '</th><th>' +
          esc(t('rh_status')) + '</th><th>' + esc(t('rh_used_in')) + '</th><th>' + esc(t('rh_used_at')) + '</th><th>' +
          esc(t('cp_expiry')) + '</th><th></th></tr></thead><tbody>' + list.map(rewardRowHtml).join('') + '</tbody></table>'
        : '<div class="empty">' + esc(t('rh_none')) + '</div>';
      tickCountdowns();
    }

    function exportRewards() {
      var list = OFFERS.rewards || [];
      if (!list.length) { toast(t('rh_none'), 'err'); return; }
      var headers = ['Code', 'Percent', 'Status', 'IssuedFrom', 'IssuedName', 'CreatedAt', 'UsedIn', 'UsedName', 'UsedAt', 'Expires', 'Uses'];
      var rows = list.map(function (r) {
        return [r.code, r.percent, rewardStatus(r), r.issued_order, r.issued_name, r.created_at, r.used_order,
          r.used_name, r.used_at, r.expires_at, r.uses].map(csvQ).join(',');
      });
      saveFile('reward_history_' + stamp() + '.csv', '\\uFEFF' + [headers.join(',')].concat(rows).join('\\r\\n'));
    }

    async function toggleCoupon(id, on) {
      var r = await api('/api/admin/coupons/update', 'POST', { id: id, active: !!on });
      if (r.ok) loadOffers(); else toast(r.data.error || t('status_fail'), 'err');
    }

    // প্রথমে confirm, তারপর কোড টাইপ করে নিশ্চিত করলে তবেই মুছবে
    async function deleteCoupon(id, code) {
      if (!(await askConfirm(t('cp_delete_step1') + ' ' + code, true))) return;
      var typed = await askText(t('cp_delete_type', { code: code }), false);
      if (typed === null) return;
      if (typed.trim().toUpperCase() !== String(code).toUpperCase()) {
        toast(t('cp_delete_mismatch'), 'err');
        return;
      }
      var r = await api('/api/admin/coupons/delete', 'POST', { id: id });
      if (r.ok) { toast(t('deleted'), 'ok'); loadOffers(); }
      else toast(r.data.error || t('status_fail'), 'err');
    }

    // Android app-এ browser download কাজ করে না, তাই app-এর save bridge আগে ব্যবহার হয়
    function saveFile(name, content) {
      if (window.AndroidApp && window.AndroidApp.saveCsv) { window.AndroidApp.saveCsv(name, content); return; }
      var blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }

    function csvQ(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    function stamp() { return new Date().toISOString().slice(0, 10); }

    function downloadCouponCsv(list, name) {
      if (!list.length) { toast(t('cp_none'), 'err'); return; }
      var headers = ['Code', 'Type', 'Percent', 'Uses', 'MaxUses', 'Status', 'ExpiresAt', 'CreatedAt', 'RewardRule'];
      var rows = list.map(function (c) {
        return [c.code, Number(c.is_personal) ? 'personal' : 'manual', c.percent, c.uses, c.max_uses,
          couponStatus(c), c.expires_at || '', c.created_at || '', c.reward_rule || ''].map(csvQ).join(',');
      });
      saveFile(name + '_' + stamp() + '.csv', '\\uFEFF' + [headers.join(',')].concat(rows).join('\\r\\n'));
    }

    function copyRaw(text, msgKey) {
      var ok = function () { toast(t(msgKey || 'cp_share_done'), 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { toast(t('copy_fail'), 'err'); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); ok(); } catch (e) { toast(t('copy_fail'), 'err'); }
        ta.remove();
      }
    }

    function shareCoupon(code, p) {
      copyRaw(t('cp_share_txt', { code: code, p: p }));
    }

    /* ---------- Inventory ---------- */

    async function loadInventory() {
      var s = await api('/api/admin/stats');
      if (s.ok) PRODUCT = s.data.product || PRODUCT;
      var r = await api('/api/admin/inventory');
      if (!r.ok) return;
      INV_ROWS = r.data.rows || [];
      renderInventory();
    }

    function renderInventory() {
      var colors = splitList(PRODUCT.colors || '');
      var sizes = splitList(PRODUCT.sizes || '');
      var cs = colors.length ? colors : [''];
      var ss = sizes.length ? sizes : [''];
      var map = {};
      INV_ROWS.forEach(function (r) { map[r.color + '|' + r.size] = Number(r.qty) || 0; });
      var head = '<tr><th>' + esc(t('inv_color')) + '</th>' + ss.map(function (s) {
        return '<th>' + esc(s || t('inv_single')) + '</th>';
      }).join('') + '<th>' + esc(t('inv_total')) + '</th></tr>';
      var body = cs.map(function (c) {
        var cells = ss.map(function (s) {
          var q = map[c + '|' + s] || 0;
          return '<td><input class="input inv-in" type="number" min="0" data-c="' + esc(c) + '" data-s="' + esc(s) + '" value="' + q + '"></td>';
        }).join('');
        return '<tr><th>' + esc(c || t('inv_single')) + '</th>' + cells + '<td class="rowtot"><strong>0</strong></td></tr>';
      }).join('');
      var foot = '<tr><th>' + esc(t('inv_total')) + '</th>' + ss.map(function (s) {
        return '<td class="colsum" data-s="' + esc(s) + '">0</td>';
      }).join('') + '<td><strong class="grand">0</strong></td></tr>';
      $('invBox').innerHTML = '<table id="invTable"><thead>' + head + '</thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table>';
      recalcInv();
    }

    function recalcInv() {
      var table = $('invTable');
      if (!table) return;
      var grand = 0;
      var colSums = {};
      table.querySelectorAll('tbody tr').forEach(function (tr) {
        var rs = 0;
        tr.querySelectorAll('.inv-in').forEach(function (inp) {
          var v = Number(inp.value) || 0;
          var key = inp.getAttribute('data-s');
          rs += v;
          colSums[key] = (colSums[key] || 0) + v;
          inp.className = 'input inv-in' + (v <= 0 ? ' out' : (v <= LOW_STOCK_VIEW ? ' low' : ''));
        });
        var rt = tr.querySelector('.rowtot strong');
        if (rt) rt.textContent = rs;
        grand += rs;
      });
      table.querySelectorAll('tfoot .colsum').forEach(function (td) {
        td.textContent = colSums[td.getAttribute('data-s')] || 0;
      });
      table.querySelector('tfoot .grand').textContent = grand;
    }

    async function saveInventory() {
      var items = [];
      document.querySelectorAll('#invTable .inv-in').forEach(function (inp) {
        items.push({ color: inp.getAttribute('data-c'), size: inp.getAttribute('data-s'), qty: Number(inp.value) || 0 });
      });
      var r = await api('/api/admin/inventory', 'POST', { items: items });
      if (r.ok) { toast(t('inv_saved'), 'ok'); loadInventory(); }
      else toast(r.data.error || t('status_fail'), 'err');
    }

    async function addVariant() {
      var color = $('ivColor').value.trim();
      var size = $('ivSize').value.trim();
      var qty = Number($('ivQty').value) || 0;
      if (!color && !size) { setMsg('ivMsg', t('inv_add_need'), false); return; }
      var r = await api('/api/admin/inventory/add', 'POST', { color: color, size: size, qty: qty });
      if (r.ok) {
        setMsg('ivMsg', t('inv_added'), true);
        toast(t('inv_added'), 'ok');
        $('ivColor').value = '';
        $('ivSize').value = '';
        $('ivQty').value = 0;
        loadInventory();
      } else {
        setMsg('ivMsg', r.data.error || t('failed'), false);
      }
    }

    /* ---------- Admins ---------- */

    async function loadUsers() {
      loadSecurity();
      var r = await api('/api/admin/users');
      if (!r.ok) return;
      var users = r.data.users || [];
      $('userList').innerHTML = users.length ? users.map(function (u) {
        var self = ME && u.id === ME.id;
        return '<div class="list-item"><div><strong>' + esc(u.username) + '</strong>' +
          (self ? ' <span class="badge s-Confirmed">' + esc(t('you')) + '</span>' : '') +
          '<div class="muted">' + esc(t('joined')) + fmtDate(u.created_at) + '</div></div>' +
          '<div class="row">' +
          '<button class="btn sm ghost" data-action="reset-user" data-id="' + Number(u.id) + '">' + esc(t('reset_pw')) + '</button>' +
          (self ? '' : '<button class="btn sm danger" data-action="delete-user" data-id="' + Number(u.id) + '">' + esc(t('delete')) + '</button>') +
          '</div></div>';
      }).join('') : '<div class="empty">' + esc(t('no_admins')) + '</div>';
    }

    async function addUser() {
      var u = $('nuUser').value.trim().toLowerCase();
      var pw = $('nuPass').value;
      var r = await api('/api/admin/users', 'POST', { username: u, password: pw });
      if (r.ok) {
        setMsg('userMsg', t('admin_added'), true);
        $('nuUser').value = '';
        $('nuPass').value = '';
        showCredentials(u, pw);
        loadUsers();
      } else {
        setMsg('userMsg', r.data.error || t('admin_add_fail'), false);
      }
    }

    // নতুন অ্যাডমিনের পাসওয়ার্ড শুধু একবার দেখানো হয় (সার্ভারে শুধু hash থাকে)
    function showCredentials(u, pw) {
      openModal(
        '<h3>' + esc(t('cred_title')) + '</h3>' +
        '<dl class="kv"><dt>' + esc(t('username')) + '</dt><dd>' + esc(u) + '</dd>' +
        '<dt>' + esc(t('password')) + '</dt><dd><span class="pid">' + esc(pw) + '</span></dd></dl>' +
        '<p class="hint-text">' + esc(t('cred_note')) + '</p>' +
        '<button class="btn block" data-action="copy" data-copy="' + esc(u + ' / ' + pw) + '">' + esc(t('act_copy')) + '</button>'
      );
    }

    async function resetUser(id) {
      var pw = await askText(t('new_pw_prompt'), true);
      if (!pw) return;
      var r = await api('/api/admin/users/reset', 'POST', { id: id, password: pw });
      toast(r.ok ? t('pw_reset_ok') : (r.data.error || t('failed')), r.ok ? 'ok' : 'err');
      loadUsers();
    }

    async function deleteUser(id) {
      if (!(await askConfirm(t('delete_admin_confirm'), true))) return;
      var r = await api('/api/admin/users/delete', 'POST', { id: id });
      toast(r.ok ? t('admin_deleted') : (r.data.error || t('failed')), r.ok ? 'ok' : 'err');
      loadUsers();
    }

    /* ---------- Logs (IP ঠিকানা সহ) ---------- */

    var LOGS = [];
    var LOG_F = 'all';
    var SEC_ACTIONS = ['login_ok', 'login_fail', 'logout_all', 'password_change', 'username_change', 'admin_add', 'admin_delete', 'admin_reset'];
    var ORD_ACTIONS = ['order_create', 'order_status', 'order_delete', 'order_note'];

    async function loadLogs() {
      var r = await api('/api/admin/logs');
      if (!r.ok) return;
      LOGS = r.data.logs || [];
      renderLogs();
    }

    function setLogFilter(v) {
      LOG_F = v;
      renderLogs();
    }

    function renderLogs() {
      var chips = [['all', 'log_all'], ['sec', 'log_sec'], ['ord', 'log_ord'], ['cat', 'log_cat']];
      $('logChips').innerHTML = chips.map(function (c) {
        return '<button type="button" class="chip' + (LOG_F === c[0] ? ' on' : '') + '" data-action="log-filter" data-v="' + c[0] + '">' + esc(t(c[1])) + '</button>';
      }).join('');
      var list = LOGS.filter(function (l) {
        if (LOG_F === 'sec') return SEC_ACTIONS.indexOf(l.action) >= 0;
        if (LOG_F === 'ord') return ORD_ACTIONS.indexOf(l.action) >= 0;
        if (LOG_F === 'cat') return ORD_ACTIONS.indexOf(l.action) < 0 && SEC_ACTIONS.indexOf(l.action) < 0;
        return true;
      });
      var fails = LOGS.filter(function (l) { return l.action === 'login_fail'; }).length;
      var head = LOG_F === 'sec' ? '<p class="hint-text" style="font-weight:700;margin:0 0 10px;">🛡️ ' + esc(t('log_fails', { n: fails })) + '</p>' : '';
      $('logBox').innerHTML = head + (list.length
        ? '<table><thead><tr><th>' + esc(t('col_time')) + '</th><th>' + esc(t('col_user')) + '</th><th>' + esc(t('col_action')) +
          '</th><th>' + esc(t('col_detail')) + '</th><th>' + esc(t('col_ip')) + '</th></tr></thead><tbody>' +
          list.map(function (l) {
            var label = ACTION_KEYS[l.action] ? ACTION_KEYS[l.action][LANG === 'bn' ? 0 : 1] : l.action;
            var sec = SEC_ACTIONS.indexOf(l.action) >= 0;
            return '<tr><td>' + fmtDate(l.created_at) + '</td><td>' + esc(l.actor) + '</td><td>' +
              (sec ? '🛡️ ' : '') + esc(label) + '</td><td>' + esc(l.target) + '</td><td>' + esc(l.ip) + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<div class="empty">' + esc(t('no_logs')) + '</div>');
    }

    // Settings > Security & account: ক্লিক করলে খোলে
    async function toggleSettingsSecurity() {
      var w = $('saWrap');
      var open = w.classList.contains('hidden');
      w.classList.toggle('hidden', !open);
      $('saArrow').textContent = open ? '▾' : '▸';
    }

    async function loadSecurity() {
      var r = await api('/api/admin/security');
      if (!r.ok || !$('secStats')) return;
      var d = r.data;
      $('secStats').innerHTML = [
        statCard(t('sec_sessions'), d.sessions, '🔐', 'blue'),
        statCard(t('sec_fails'), d.failed24h, '🚫', 'amber'),
        statCard(t('sec_admins'), d.admins, '👥', 'green'),
        statCard(t('sec_last'), d.lastLogin ? fmtDate(d.lastLogin) : '—', '🕒', 'purple')
      ].join('');
      $('secInfo').textContent = t('sec_user', { u: ME ? ME.username : '' });
    }

    // Printer settings: ডিফল্টে বন্ধ থাকে, ক্লিক করলে খোলে
    async function togglePrinter() {
      var wrap = $('printWrap');
      var willOpen = wrap.classList.contains('hidden');
      wrap.classList.toggle('hidden', !willOpen);
      $('prArrow').textContent = willOpen ? '▾' : '▸';
      if (willOpen) await loadSettings();
    }

    /* ---------- Settings: security & printer ---------- */

    async function changeOwnPass() {
      var cur = $('cpCurrent').value;
      var nw = $('cpNew').value;
      var cf = $('cpConfirm').value;
      if (nw !== cf) { setMsg('passMsg', t('pw_mismatch'), false); return; }
      var r = await api('/api/admin/me/password', 'POST', { current: cur, new: nw });
      if (r.ok) {
        $('cpCurrent').value = '';
        $('cpNew').value = '';
        $('cpConfirm').value = '';
        forceLogout(t('pw_changed'));
      }
      else setMsg('passMsg', r.data.error || t('pw_fail'), false);
    }

    async function changeOwnUser() {
      var r = await api('/api/admin/me/username', 'POST', {
        current: $('unCur').value,
        username: $('unNew').value.trim()
      });
      if (r.ok) {
        ME.username = r.data.username;
        $('whoBadge').textContent = ME.username.charAt(0).toUpperCase();
        $('unCur').value = '';
        $('unNew').value = '';
        setMsg('unMsg', t('un_done'), true);
      } else {
        setMsg('unMsg', r.data.error || t('failed'), false);
      }
    }

    async function loadSettings() {
      var r = await api('/api/admin/print');
      if (r.ok) { PRINT = r.data.print; PRINT_SAVED = JSON.parse(JSON.stringify(PRINT)); }
      renderPrinter();
    }

    function setPrintTab(v) {
      PRINT_TAB = v === 'pos' ? 'pos' : 'invoice';
      renderPrinter();
    }

    function applyPrintTheme(id) {
      var th = themeList().filter(function (x) { return x.id === id; })[0];
      var c = PRINT[PRINT_TAB];
      if (!th || !c) return;
      c.theme = th.id;
      c.primary = th.primary;
      c.text = th.text;
      c.bg = th.bg;
      c.line = th.line;
      c.header_bg = th.header;
      c.font = th.font;
      renderPrinter();
    }

    async function handleLogo(file) {
      try {
        var data = await shrinkImage(file, 400, 0.9);
        if (data.length > 250 * 1024) { toast(t('pr_logo_big'), 'err'); return; }
        PRINT[PRINT_TAB].logo = data;
        renderPrinter();
      } catch (err) {
        toast(t('img_fail', { name: file.name }), 'err');
      }
    }

    async function savePrint() {
      var r = await api('/api/admin/print', 'POST', { kind: PRINT_TAB, cfg: PRINT[PRINT_TAB] });
      if (r.ok) {
        PRINT_SAVED = JSON.parse(JSON.stringify(PRINT));
        toast(t('pr_saved'), 'ok');
      } else {
        toast(r.data.error || t('status_fail'), 'err');
      }
    }

    function revertPrint() {
      PRINT = JSON.parse(JSON.stringify(PRINT_SAVED || PRINT));
      renderPrinter();
    }

    function updatePrintPreview() {
      var box = $('printPrev');
      var c = PRINT[PRINT_TAB];
      if (box && c) box.innerHTML = pdPreviewHtml(sampleOrder(), c, 'pvPrint');
    }

    function renderPrinter() {
      var box = $('printBox');
      var c = PRINT[PRINT_TAB];
      if (!box || !c) return;
      var tabs = '<div class="chips">' +
        '<button type="button" class="chip' + (PRINT_TAB === 'invoice' ? ' on' : '') + '" data-action="pr-tab" data-v="invoice">' + esc(t('pr_invoice')) + '</button>' +
        '<button type="button" class="chip' + (PRINT_TAB === 'pos' ? ' on' : '') + '" data-action="pr-tab" data-v="pos">' + esc(t('pr_pos')) + '</button></div>';
      var themes = '<div class="th-grid">' + themeList().map(function (th) {
        return '<button type="button" class="th-btn' + (c.theme === th.id ? ' on' : '') + '" data-action="pt-theme" data-v="' + th.id + '">' +
          '<span class="th-sw" style="background:' + th.primary + '"></span><span>' + esc(th.name) + '</span></button>';
      }).join('') + '</div>';
      var pages = Object.keys(PD_PAGE).map(function (k) {
        return '<option value="' + k + '"' + (c.page === k ? ' selected' : '') + '>' + k + '</option>';
      }).join('');
      var num = function (label, field, min, max) {
        return '<div class="field"><label>' + esc(label) + '</label><input class="input" type="number" min="' + min + '" max="' + max + '" data-pf="' + field + '" value="' + c[field] + '"></div>';
      };
      var txt = function (label, field, max) {
        return '<div class="field"><label>' + esc(label) + '</label><input class="input" type="text" maxlength="' + max + '" data-pf="' + field + '" value="' + esc(c[field]) + '"></div>';
      };
      var col = function (label, field) {
        return '<div class="field"><label>' + esc(label) + '</label><input class="input" type="color" data-pf="' + field + '" value="' + c[field] + '"></div>';
      };
      var chk = function (label, field) {
        return '<label class="chk"><input type="checkbox" data-pf="' + field + '"' + (c[field] ? ' checked' : '') + '> <span>' + esc(label) + '</span></label>';
      };
      var sel = function (label, field, opts) {
        var numeric = typeof c[field] === 'number' ? ' data-pnum="1"' : '';
        return '<div class="field"><label>' + esc(label) + '</label><select class="input" data-pf="' + field + '"' + numeric + '>' +
          opts.map(function (o) {
            return '<option value="' + o[0] + '"' + (String(c[field]) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
          }).join('') + '</select></div>';
      };
      var shows = PRINT_KEYS.map(function (k) {
        return '<label class="chk"><input type="checkbox" data-pshow="' + k + '"' + (c.show[k] ? ' checked' : '') + '> <span>' +
          esc(PRINT_LABEL[k][LANG === 'bn' ? 0 : 1]) + '</span></label>';
      }).join('');
      var logo = '<div class="field"><label>' + esc(t('pr_logo')) + '</label><div class="nt-img-row">' +
        '<input class="input" type="file" accept="image/*" data-pfile="logo">' +
        (c.logo ? '<img class="logo-thumb" src="' + esc(c.logo) + '" alt=""><button type="button" class="btn sm ghost" data-action="pt-logo-del">' + esc(t('pr_logo_rm')) + '</button>' : '') +
        '</div></div>';
      var adv = '<details class="adv"><summary>' + esc(t('pr_adv')) + '</summary><div class="grid-2" style="margin-top:10px;">' +
        num(t('pr_line_h'), 'line_h', 110, 220) +
        num(t('pr_radius'), 'box_radius', 0, 16) +
        sel(t('pr_table'), 'table_style', [['grid', t('pr_tb_grid')], ['plain', t('pr_tb_plain')], ['zebra', t('pr_tb_zebra')]]) +
        sel(t('pr_fw'), 'font_weight', [[400, t('pr_fw_n')], [600, t('pr_fw_b')], [800, t('pr_fw_x')]]) +
        sel(t('pr_halign'), 'align', [['left', t('tb_left')], ['center', t('tb_center')], ['right', t('tb_right')]]) +
        txt(t('pr_wm'), 'watermark', 30) +
        '<div>' + chk(t('pr_upper'), 'head_upper') + '</div><div>' + chk(t('pr_compact'), 'compact') + '</div>' +
        '</div></details>';

      box.innerHTML = tabs + themes +
        '<div class="pr-grid"><div class="pr-form">' +
          '<div class="grid-2">' + txt(t('pr_brand'), 'brand', 60) + txt(t('pr_tag'), 'tagline', 120) +
            txt(t('pr_contact'), 'contact', 120) + num(t('pr_logo_w'), 'logo_w', 20, 220) + '</div>' +
          logo +
          '<div class="grid-4">' + col(t('pr_primary'), 'primary') + col(t('pr_text'), 'text') +
            col(t('pr_bg'), 'bg') + col(t('pr_line'), 'line') + '</div>' +
          '<div class="grid-4">' + num(t('pr_base'), 'base', 8, 22) + num(t('pr_margin'), 'margin', 0, 25) +
            sel(t('pr_page'), 'page', Object.keys(PD_PAGE).map(function (k) { return [k, k]; })) +
            sel(t('nt_font'), 'font', [['sans', t('nt_f_sans')], ['serif', t('nt_f_serif')], ['mono', t('nt_f_mono')], ['display', t('nt_f_display')]]) +
          '</div>' +
          '<div class="row" style="margin-bottom:10px;">' + chk(t('pr_header'), 'header_bg') + chk(t('pr_lines'), 'line_on') + '</div>' +
          adv +
          '<div class="lbl">' + esc(t('pr_show')) + '</div><div class="show-grid">' + shows + '</div>' +
          '<div class="grid-2">' +
            '<div class="field"><label>' + esc(t('pr_footer_bn')) + '</label><textarea class="input" rows="2" data-pf="footer_bn">' + esc(c.footer_bn) + '</textarea></div>' +
            '<div class="field"><label>' + esc(t('pr_footer_en')) + '</label><textarea class="input" rows="2" data-pf="footer_en">' + esc(c.footer_en) + '</textarea></div>' +
          '</div>' +
          '<div class="row"><button type="button" class="btn" data-action="pt-save">' + esc(t('pr_save')) + '</button>' +
            '<button type="button" class="btn ghost" data-action="pt-reset">' + esc(t('pr_reset')) + '</button></div>' +
        '</div><div class="pr-side"><div class="lbl" style="margin-bottom:8px;">' + esc(t('pr_preview')) + '</div><div id="printPrev"></div></div></div>';
      updatePrintPreview();
    }

    /* ---------- Android bridge ---------- */

    function registerDevice(tokenFromApp) {
      var tk = tokenFromApp || (window.AndroidApp && window.AndroidApp.getFcmToken ? window.AndroidApp.getFcmToken() : '');
      if (tk && TOKEN) api('/api/admin/devices', 'POST', { token: tk });
    }

    /* ---------- Printer & search listeners ---------- */

    function onPrintInput(e) {
      var el = e.target;
      if (!el || !el.closest || !el.closest('#printBox')) return;
      var c = PRINT[PRINT_TAB];
      if (!c) return;
      var pk = el.getAttribute('data-pshow');
      if (pk) { c.show[pk] = el.checked; updatePrintPreview(); return; }
      var f = el.getAttribute('data-pf');
      if (!f) return;
      if (el.type === 'checkbox') c[f] = el.checked;
      else if (el.getAttribute('data-pnum') || el.type === 'number') c[f] = Number(el.value) || 0;
      else c[f] = el.value;
      updatePrintPreview();
    }

    function onPrintFile(e) {
      var el = e.target;
      if (el && el.getAttribute && el.getAttribute('data-pfile') === 'logo' && el.files && el.files[0]) {
        handleLogo(el.files[0]);
      }
    }

    document.addEventListener('input', onPrintInput);
    document.addEventListener('change', onPrintInput);
    document.addEventListener('change', onPrintFile);
    document.addEventListener('input', function (e) {
      if (e.target.id === 'cpSearch') { CP_FILTER.q = e.target.value.trim(); renderCoupons(); }
      else if (e.target.id === 'rwSearch') { RW_Q = e.target.value.trim(); renderRewards(); }
    });

    /* ---------- Events ---------- */

    // চোখ বাটনে চাপ দিলে input-এর ফোকাস যেন না হারায়
    document.addEventListener('mousedown', function (e) {
      if (e.target.closest && e.target.closest('.eye')) e.preventDefault();
    });

    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      var a = el.getAttribute('data-action');
      var pid = el.getAttribute('data-pid');
      var id = Number(el.getAttribute('data-id'));

      if (a === 'login') doLogin();
      else if (a === 'toggle-pw') togglePw(el);
      else if (a === 'save-inv') saveInventory();
      else if (a === 'save-bulk') saveBulk();
      else if (a === 'coupon-create') createCoupon();
      else if (a === 'coupon-gen') generateCouponCode();
      else if (a === 'save-notes') saveNotes();
      else if (a === 'coupon-hist-all') downloadCouponCsv(OFFERS.coupons, 'coupons_history');
      else if (a === 'coupon-toggle') toggleCoupon(id, el.getAttribute('data-on') === '1');
      else if (a === 'coupon-del') deleteCoupon(id, el.getAttribute('data-code'));
      else if (a === 'save-note') saveNote(pid);
      else if (a === 'add-variant') addVariant();
      else if (a === 'tb-reset') resetTopbar();
      else if (a === 'logout') logout();
      else if (a === 'logout-all') logoutAll();
      else if (a === 'lang') toggleLang();
      else if (a === 'theme') toggleTheme();
      else if (a === 'go') go(el.getAttribute('data-view'));
      else if (a === 'refresh') refreshCurrent();
      else if (a === 'more') loadOrders(false);
      else if (a === 'csv') exportCSV();
      else if (a === 'open-order') openOrder(el.getAttribute('data-pid'));
      else if (a === 'copy') copyText(el.getAttribute('data-copy'));
      else if (a === 'preview') previewDoc(pid, 'invoice');
      else if (a === 'preview-pos') previewDoc(pid, 'pos');
      else if (a === 'status-back') openOrder(pid);
      else if (a === 'print') printDoc(pid, el.getAttribute('data-kind') || 'invoice');
      else if (a === 'download') downloadDoc(pid, el.getAttribute('data-kind') || 'invoice');
      else if (a === 'delete-order') deleteOrder(pid);
      else if (a === 'close-modal') closeModal();
      else if (a === 'add-url') addUrlImage();
      else if (a === 'remove-img') { IMAGES.splice(Number(el.getAttribute('data-idx')), 1); renderImagePreviews(); }
      else if (a === 'faq-add') { if (FAQS.length < 10) { FAQS.push(Object.assign({}, DEFAULT_FAQ_BLANK)); renderFaqEditor(); } }
      else if (a === 'faq-del') { FAQS.splice(Number(el.getAttribute('data-idx')), 1); renderFaqEditor(); }
      else if (a === 'notice-add') {
        if (NOTICES.length >= MAX_NOTICES) { toast(t('nt_max', { n: MAX_NOTICES }), 'err'); return; }
        NOTICES.push(Object.assign({}, NOTICE_DEFAULT));
        renderNotices();
      }
      else if (a === 'notice-del') { NOTICES.splice(Number(el.getAttribute('data-idx')), 1); renderNotices(); }
      else if (a === 'notice-img-del') { NOTICES[Number(el.getAttribute('data-idx'))].image = ''; renderNotices(); }
      else if (a === 'save-product') saveProduct();
      else if (a === 'add-user') addUser();
      else if (a === 'reset-user') resetUser(id);
      else if (a === 'delete-user') deleteUser(id);
      else if (a === 'change-pass') changeOwnPass();
      else if (a === 'un-save') changeOwnUser();
      else if (a === 'pr-tab') setPrintTab(el.getAttribute('data-v'));
      else if (a === 'pt-theme') applyPrintTheme(el.getAttribute('data-v'));
      else if (a === 'pt-logo-del') { PRINT[PRINT_TAB].logo = ''; renderPrinter(); }
      else if (a === 'pt-save') savePrint();
      else if (a === 'pt-reset') revertPrint();
      else if (a === 'design') openPrinter(el.getAttribute('data-kind'));
      else if (a === 'cp-filter') { CP_FILTER.s = el.getAttribute('data-v'); renderCouponChips(); renderCoupons(); }
      else if (a === 'cp-share') shareCoupon(el.getAttribute('data-code'), el.getAttribute('data-p'));
      else if (a === 'cp-pct') $('cpPct').value = el.getAttribute('data-v');
      else if (a === 'pr-toggle') togglePrinter();
      else if (a === 'log-filter') setLogFilter(el.getAttribute('data-v'));
      else if (a === 'rw-filter') setRwFilter(el.getAttribute('data-v'));
      else if (a === 'rw-export') exportRewards();
      else if (a === 'sec-refresh') loadSecurity();
      else if (a === 'gv-save') saveGiveaway();
      else if (a === 'gv-gen') generateGiveCode();
      else if (a === 'gv-toggle') toggleGiveaway();
      else if (a === 'sa-toggle') toggleSettingsSecurity();
    });

    document.addEventListener('input', function (e) {
      var el = e.target;
      if (el.getAttribute && el.getAttribute('data-nkind') === 'f') { onNoticeInput(el); return; }
      if (el.getAttribute && el.getAttribute('data-kind')) {
        var idx = Number(el.getAttribute('data-idx'));
        var field = el.getAttribute('data-field');
        if (el.getAttribute('data-kind') === 'trust' && TRUST[idx]) TRUST[idx][field] = el.value;
        if (el.getAttribute('data-kind') === 'faq' && FAQS[idx]) FAQS[idx][field] = el.value;
        return;
      }
      if (el.id && el.id.indexOf('tb') === 0) { renderTbPreview(); return; }
      if (el.classList && el.classList.contains('inv-in')) { recalcInv(); return; }
      if (el.id === 'oSearch') {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () { loadOrders(true); }, 300);
      }
    });

    document.addEventListener('change', function (e) {
      var t2 = e.target;
      if (t2.getAttribute && t2.getAttribute('data-nkind') === 'f') {
        onNoticeInput(t2);
      } else if (t2.getAttribute && t2.getAttribute('data-nkind') === 'file') {
        if (t2.files && t2.files[0]) handleNoticeFile(Number(t2.getAttribute('data-idx')), t2.files[0]);
      } else if (t2.getAttribute && t2.getAttribute('data-nkind') === 'url') {
        var val = t2.value.trim();
        var nidx = Number(t2.getAttribute('data-idx'));
        if (/^https:\\/\\//i.test(val) && NOTICES[nidx]) { NOTICES[nidx].image = val; renderNotices(); }
      } else if (t2.getAttribute && t2.getAttribute('data-action') === 'status') {
        updateStatus(t2.getAttribute('data-pid'), t2.value);
      } else if (t2.id === 'pFiles') {
        handleImages(e);
      } else if (t2.id === 'tbAlign') {
        renderTbPreview();
      } else if (t2.id === 'oStatus' || t2.id === 'oRange') {
        loadOrders(true);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.target.id === 'loginUser' || e.target.id === 'loginPass')) doLogin();
      if (e.key === 'Escape') closeModal();
    });

    $('modal').addEventListener('click', function (e) {
      if (e.target.id === 'modal') closeModal();
    });

    setInterval(function () {
      if (document.visibilityState === 'visible' && TOKEN && !$('modal').classList.contains('show')) {
        if (VIEW === 'orders' || VIEW === 'dashboard') refreshCurrent();
      }
    }, 60000);

    setInterval(tickCountdowns, 30000);
    window.registerDevice = registerDevice;

    // অ্যাডমিন ডিফল্টে English; ভাষা আলাদাভাবে সংরক্ষিত
    LANG = prefsStore.get('admin_lang') === 'bn' ? 'bn' : 'en';
    initTheme();
    initEyes();
    applyLang();
    boot();
  </script>
</body>
</html>`;
}