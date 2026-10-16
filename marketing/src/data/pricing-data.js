/**
 * pricing-data.js
 * Multi-language source of truth for Intelligent ERP Marketing Plans
 * Plans: Free · Basic · Standard · Premium
 * Languages: EN, AR, BN
 */

// Baseline Plan Config (Prices in SAR)
const basePlansData = [
  {
    id: "free",
    color: "#6b7280",
    accentGradient: "linear-gradient(135deg, #374151, #6b7280)",
    popular: false,
    cycles: {
      annual:  { price: 0, label: "Forever Free", perDay: 0, amc: 0 },
      halfYear:{ price: 0, label: "Forever Free", perDay: 0, amc: 0 },
      monthly: { price: 0, label: "Forever Free", perDay: 0, amc: 0 },
    },
    translations: {
      en: {
        name: "Free",
        tagline: "Start with zero risk",
        description: "Explore the full system at no cost. No credit card needed.",
        cta: "Start Free",
        highlights: [
          "300 invoices / month",
          "500 KB per image",
          "Single branch",
          "Basic POS & billing",
          "No credit card required",
        ]
      },
      ar: {
        name: "المجانية",
        tagline: "ابدأ بدون أي مخاطرة",
        description: "استكشف النظام بالكامل مجاناً بدون الحاجة لبطاقة ائتمان.",
        cta: "ابدأ مجاناً",
        highlights: [
          "300 فاتورة / شهرياً",
          "500 ك.ب لكل صورة",
          "فرع واحد فقط",
          "نظام كاشير وفوترة أساسي",
          "لا تتطلب بطاقة ائتمان",
        ]
      },
      bn: {
        name: "ফ্রি",
        tagline: "ঝুঁকিমুক্তভাবে শুরু করুন",
        description: "কোনো খরচ ছাড়াই পুরো সিস্টেম এক্সপ্লোর করুন। ক্রেডিট কার্ডের প্রয়োজন নেই।",
        cta: "ফ্রি শুরু করুন",
        highlights: [
          "প্রতি মাসে ৩০০টি ইনভয়েস",
          "ছবি প্রতি ৫০০ কেবি স্টোরেজ",
          "একক ব্রাঞ্চ",
          "বেসিক POS ও বিলিং",
          "কোনো ক্রেডিট কার্ড লাগবে না",
        ]
      }
    }
  },
  {
    id: "basic",
    color: "#3b82f6",
    accentGradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
    popular: false,
    cycles: {
      annual:  { price: 1800, listPrice: 3000, discountPct: 40, perDay: 5, amc: 0  },
      halfYear:{ price: 1020, listPrice: 3000, discountPct: 40, perDay: 5, amc: 30 },
      monthly: { price: 180,  listPrice: 3000, discountPct: 40, perDay: 5, amc: 30 },
    },
    translations: {
      en: {
        name: "Basic",
        tagline: "Everything a growing shop needs",
        description: "Full POS, inventory, staff salary and more — for less than a coffee a day.",
        cta: "Start Basic",
        highlights: [
          "1,000 KB per image",
          "Sizes & colors variants",
          "EMI / installment sales",
          "Staff salary & quotations",
          "Barcode printing",
        ]
      },
      ar: {
        name: "الأساسية",
        tagline: "كل ما يحتاجه المحل النامي",
        description: "نقاط بيع، مخزون، رواتب موظفين وأكثر — بتكلفة أقل من كوب قهوة يومي.",
        cta: "اشترك بالأساسية",
        highlights: [
          "1,000 ك.ب لكل صورة",
          "دعم المقاسات والألوان",
          "مبيعات الأقساط",
          "رواتب الموظفين وعروض الأسعار",
          "طباعة الباركود",
        ]
      },
      bn: {
        name: "বেসিক",
        tagline: "ক্রমবর্ধমান দোকানের প্রয়োজনীয় সব কিছু",
        description: "সম্পূর্ণ POS, ইনভেন্টরি, কর্মীদের বেতন ও অন্যান্য — দৈনন্দিন কফির চেয়েও কম খরচে।",
        cta: "বেসিক শুরু করুন",
        highlights: [
          "ছবি প্রতি ১,০০০ কেবি",
          "সাইজ ও কালার ভ্যারিয়েন্ট",
          "ইএমআই ও কিস্তিতে বিক্রি",
          "স্টাফ স্যালারি ও কোটেশন",
          "বারকোড প্রিন্টিং",
        ]
      }
    }
  },
  {
    id: "standard",
    color: "#8b5cf6",
    accentGradient: "linear-gradient(135deg, #6d28d9, #8b5cf6)",
    popular: true,
    cycles: {
      annual:  { price: 6000, listPrice: 6000, discountPct: 40, perDay: 10, amc: 0  },
      halfYear:{ price: 2100, listPrice: 6000, discountPct: 40, perDay: 10, amc: 60 },
      monthly: { price: 360,  listPrice: 6000, discountPct: 40, perDay: 10, amc: 60 },
    },
    translations: {
      en: {
        name: "Standard",
        tagline: "For multi-branch & restaurants",
        description: "Multi-branch, restaurant KOT, WhatsApp integration and AI assistant included.",
        cta: "Start Standard",
        highlights: [
          "5,000 KB per image",
          "Multi-branch & stock transfer",
          "Table, KOT & QR menu",
          "WhatsApp Business",
          "AI assistant included",
        ]
      },
      ar: {
        name: "القياسية",
        tagline: "للمتاجر متعددة الفروع والمطاعم",
        description: "فروع متعددة، طلبات المطاعم، ربط الواتساب والمساعد الذكي.",
        cta: "اشترك بالقياسية",
        highlights: [
          "5,000 ك.ب لكل صورة",
          "فروع متعددة وتحويل المخزون",
          "طاولات وطلبات وقائمة QR",
          "واتساب الأعمال التلقائي",
          "مساعد الذكاء الاصطناعي",
        ]
      },
      bn: {
        name: "স্ট্যান্ডার্ড",
        tagline: "মাল্টি-ব্রাঞ্চ ও রেস্তোরাঁর জন্য",
        description: "মাল্টি-ব্রাঞ্চ, রেস্তোরাঁ KOT, হোয়াটসঅ্যাপ ইন্টিগ্রেশন ও এআই অ্যাসিস্ট্যান্ট অন্তর্ভুক্ত।",
        cta: "স্ট্যান্ডার্ড শুরু করুন",
        highlights: [
          "ছবি প্রতি ৫,০০০ কেবি",
          "মাল্টি-ব্রাঞ্চ ও স্টক ট্রান্সফার",
          "টেবিল, KOT ও QR মেনু",
          "হোয়াটসঅ্যাপ বিজনেস",
          "এআই অ্যাসিস্ট্যান্ট",
        ]
      }
    }
  },
  {
    id: "premium",
    color: "#f59e0b",
    accentGradient: "linear-gradient(135deg, #b45309, #f59e0b)",
    popular: false,
    cycles: {
      annual:  { price: 6000,  listPrice: 10000, discountPct: 40, perDay: 16, amc: 0  },
      halfYear:{ price: 3540,  listPrice: 10000, discountPct: 40, perDay: 16, amc: 60 },
      monthly: { price: 600,   listPrice: 10000, discountPct: 40, perDay: 16, amc: 60 },
    },
    translations: {
      en: {
        name: "Premium",
        tagline: "Unlimited power for enterprise",
        description: "Unlimited storage, full API access, custom SMS templates and legacy data migration.",
        cta: "Go Premium",
        highlights: [
          "Unlimited image storage",
          "Full API access",
          "Editable SMS templates",
          "Old book records import",
          "Data import wizard (5k+ items)",
        ]
      },
      ar: {
        name: "المتقدمة",
        tagline: "قوة غير محدودة للمؤسسات",
        description: "تخزين غير محدود، ربط API، قوالب SMS ونقل البيانات القديمة.",
        cta: "احصل على المتقدمة",
        highlights: [
          "تخزين صور غير محدود",
          "وصول كامل لربط API",
          "قوالب رسائل SMS قابلة للتعديل",
          "استيراد السجلات الدفترية القديمة",
          "معالج استيراد البيانات (+5k منتج)",
        ]
      },
      bn: {
        name: "প্রিমিয়াম",
        tagline: "এন্টারপ্রাইজের জন্য অসীম ক্ষমতা",
        description: "আনলিমিটেড স্টোরেজ, ফুল API অ্যাক্সেস, কাস্টম SMS টেমপ্লেট ও ডাটা মাইগ্রেশন।",
        cta: "প্রিমিয়াম শুরু করুন",
        highlights: [
          "আনলিমিটেড ইমেজ স্টোরেজ",
          "ফুল API অ্যাক্সেস",
          "এডিটেবল SMS টেমপ্লেট",
          "পুরানো খাতার ডাটা ইমপোর্ট",
          "ডাটা ইমপোর্ট উইজার্ড (৫k+ আইটেম)",
        ]
      }
    }
  }
];

export function getLocalizedPlans(lang = 'en') {
  const l = ['en', 'ar', 'bn'].includes(lang) ? lang : 'en';
  return basePlansData.map(plan => {
    const t = plan.translations[l] || plan.translations['en'];
    return {
      id: plan.id,
      color: plan.color,
      accentGradient: plan.accentGradient,
      popular: plan.popular,
      cycles: plan.cycles,
      name: t.name,
      tagline: t.tagline,
      description: t.description,
      cta: t.cta,
      highlights: t.highlights,
    };
  });
}

// ── BILLING CYCLES ──────────────────────────────────────────────────────────
export function getLocalizedCycles(lang = 'en') {
  if (lang === 'ar') {
    return [
      { id: 'annual',   label: 'سنوي',    badge: 'الأفضل قيمة', subLabel: '/ سنة' },
      { id: 'halfYear', label: '6 أشهر',  badge: null,          subLabel: '/ 6 أشهر' },
      { id: 'monthly',  label: 'شهري',   badge: null,          subLabel: '/ شهر' },
    ];
  }
  if (lang === 'bn') {
    return [
      { id: 'annual',   label: 'বার্ষিক',    badge: 'সেরা অফার', subLabel: '/ বছর' },
      { id: 'halfYear', label: '৬ মাস',     badge: null,        subLabel: '/ ৬ মাস' },
      { id: 'monthly',  label: 'মাসিক',     badge: null,        subLabel: '/ মাস' },
    ];
  }
  return [
    { id: 'annual',   label: 'Annual',    badge: 'Best Value', subLabel: '/ year' },
    { id: 'halfYear', label: '6 Months',  badge: null,         subLabel: '/ 6 months' },
    { id: 'monthly',  label: 'Monthly',   badge: null,         subLabel: '/ month' },
  ];
}

// ── FEATURE GROUPS ─────────────────────────────────────────────────────────
export function getLocalizedFeatureGroups(lang = 'en') {
  if (lang === 'ar') {
    return [
      {
        id: "core",
        icon: "🧾",
        title: "نقاط البيع والفوترة الأساسية",
        subtitle: "كل ما تحتاجه للبدء في البيع فوراً",
        features: [
          { name: "الفواتير الشهرية",                 free: "300",   basic: "غير محدود", standard: "غير محدود", premium: "غير محدود" },
          { name: "حجم تخزين الصور للكل ملف",         free: "500 ك.ب",basic: "1 م.ب",    standard: "5 م.ب",    premium: "غير محدود" },
          { name: "أحجام وألوان المنتجات",           free: false,   basic: true,        standard: true,        premium: true        },
          { name: "مبيعات الأقساط",                   free: false,   basic: true,        standard: true,        premium: true        },
          { name: "عروض الأسعار",                    free: false,   basic: true,        standard: true,        premium: true        },
          { name: "سندات التسليم",                   free: false,   basic: true,        standard: true,        premium: true        },
          { name: "الاستبدال والاسترجاع",             free: false,   basic: true,        standard: true,        premium: true        },
          { name: "الحجوزات المسبقة",                free: false,   basic: true,        standard: true,        premium: true        },
          { name: "تسجيل المستحقات السريع",          free: false,   basic: true,        standard: true,        premium: true        },
        ],
      },
      {
        id: "inventory",
        icon: "📦",
        title: "المخزون والمنتجات",
        subtitle: "التحكم الكامل بمخزونك من الرف إلى البيع",
        features: [
          { name: "سجل المخزون وكشف الحساب",        free: false,   basic: true,  standard: true,  premium: true  },
          { name: "جرد المخزون والتدقيق",            free: false,   basic: true,  standard: true,  premium: true  },
          { name: "طباعة الباركود",                  free: false,   basic: true,  standard: true,  premium: true  },
          { name: "إدخال المستودع والبحث",          free: false,   basic: true,  standard: true,  premium: true  },
          { name: "استلام الوزن مع الخصومات",        free: false,   basic: true,  standard: true,  premium: true  },
          { name: "الأرقام التسلسلية والضمان",       free: false,   basic: false, standard: true,  premium: true  },
          { name: "شروط وفترة الضمان",               free: false,   basic: false, standard: true,  premium: true  },
          { name: "إدارة المرتجعات والصيانة RMA",     free: false,   basic: false, standard: true,  premium: true  },
          { name: "تتبع الدفعات وتاريخ الصلاحية",     free: false,   basic: false, standard: true,  premium: true  },
        ],
      },
      {
        id: "restaurant",
        icon: "🍽️",
        title: "المطاعم والطاولات",
        subtitle: "مصمم للمطاعم والمقاهي — من الكاشير إلى الطاولات",
        features: [
          { name: "طاولات، طلبات المطبخ والمطاعم", free: false, basic: false, standard: true, premium: true },
          { name: "قائمة QR مع الصور ووقت التحضير", free: false, basic: false, standard: true, premium: true },
          { name: "سجل الصندوق وتقارير الكاونتر",   free: false, basic: false, standard: true, premium: true },
        ],
      },
      {
        id: "staff",
        icon: "👥",
        title: "إدارة الموظفين والرواتب",
        subtitle: "احسب الرواتب، تتبع الحضور وطوّر فريقك",
        features: [
          { name: "رواتب الموظفين",                  free: false, basic: true,  standard: true, premium: true },
          { name: "حضور وانصراف الموظفين",           free: false, basic: false, standard: true, premium: true },
          { name: "تقييم الموظف الشهري",             free: false, basic: true,  standard: true, premium: true },
          { name: "الحوافز والمكافآت",                free: false, basic: true,  standard: true, premium: true },
          { name: "مندوبي المبيعات",                 free: false, basic: true,  standard: true, premium: true },
          { name: "عمولات على منتجات محددة",        free: false, basic: true,  standard: true, premium: true },
          { name: "عمولات الفنيين الدائمة",         free: false, basic: true,  standard: true, premium: true },
          { name: "خصومات الموظفين وحدود الأسعار", free: false, basic: true,  standard: true, premium: true },
        ],
      },
      {
        id: "finance",
        icon: "💰",
        title: "المالية والديون",
        subtitle: "وضوح مالي كامل من اليوم الأول",
        features: [
          { name: "سجل الآجل والديون",               free: false, basic: true,  standard: true, premium: true },
          { name: "سجل الشيكات",                   free: false, basic: true,  standard: true, premium: true },
          { name: "بوابة العملاء الخاصة",           free: false, basic: true,  standard: true, premium: true },
          { name: "نقاط الولاء للعملاء",             free: false, basic: true,  standard: true, premium: true },
          { name: "عمولات الإحالة والتوصية",         free: false, basic: true,  standard: true, premium: true },
          { name: "كوبونات الخصم والتكاليف",          free: false, basic: true,  standard: true, premium: true },
          { name: "رأس المال والمستثمرين",           free: false, basic: true,  standard: true, premium: true },
          { name: "سجل القروض",                     free: false, basic: true,  standard: true, premium: true },
          { name: "ميزانيات المصروفات",               free: false, basic: false, standard: true, premium: true },
          { name: "أرباح كل عميل على حدة",         free: false, basic: false, standard: true, premium: true },
        ],
      },
      {
        id: "manufacturing",
        icon: "🏭",
        title: "الإنتاج والتصنيع",
        subtitle: "من الوصفة إلى التجميع — تتبع كامل",
        features: [
          { name: "قائمة المكونات (الوصفة/المواد)",  free: false, basic: true, standard: true, premium: true },
          { name: "سجل الإنتاج اليومي",              free: false, basic: true, standard: true, premium: true },
          { name: "خطة إنتاج الغد",                  free: false, basic: true, standard: true, premium: true },
          { name: "حاسبة هامش المكونات",              free: false, basic: true, standard: true, premium: true },
          { name: "فحص الدفعات وسجل التغيرات",       free: false, basic: true, standard: true, premium: true },
          { name: "ملصقات العبوات (الدفعة والمكونات)",free: false, basic: true, standard: true, premium: true },
          { name: "تتبع الشحنات وقائمة الاستدعاء",    free: false, basic: true, standard: true, premium: true },
        ],
      },
      {
        id: "analytics",
        icon: "📊",
        title: "الأهداف والتحليلات",
        subtitle: "اعرف أرقامك وحقق أهدافك",
        features: [
          { name: "الأهداف الشهرية للشركة",         free: false, basic: true,  standard: true, premium: true },
          { name: "تنبيه البيع بأقل من السعر",       free: false, basic: true,  standard: true, premium: true },
          { name: "مناطق التوصيل والتحصيل",         free: false, basic: true,  standard: true, premium: true },
          { name: "تتبع شركات الشحن",               free: false, basic: true,  standard: true, premium: true },
          { name: "أوامر الصيانة والخدمات",          free: false, basic: true,  standard: true, premium: true },
          { name: "الفروع المتعددة وتحويل المخزون",  free: false, basic: false, standard: true, premium: true },
          { name: "واتساب الأعمال التلقائي",         free: false, basic: false, standard: true, premium: true },
          { name: "مساعد الذكاء الاصطناعي",         free: false, basic: false, standard: true, premium: true },
        ],
      },
      {
        id: "enterprise",
        icon: "🚀",
        title: "المؤسسات والربط",
        subtitle: "للسلاسل والمؤسسات والمطورين",
        features: [
          { name: "وصول كامل برمجياً API",            free: false, basic: false, standard: false, premium: true },
          { name: "قوالب رسائل SMS قابلة للتعديل",  free: false, basic: false, standard: false, premium: true },
          { name: "استيراد السجلات الدفترية القديمة", free: false, basic: false, standard: false, premium: true },
          { name: "معالج استيراد البيانات (+5k منتج)",free: false, basic: false, standard: false, premium: true },
        ],
      },
    ];
  }

  if (lang === 'bn') {
    return [
      {
        id: "core",
        icon: "🧾",
        title: "কোর POS ও বিলিং",
        subtitle: "বিক্রি শুরু করার জন্য প্রয়োজনীয় সব কিছু",
        features: [
          { name: "মাসিক ইনভয়েস",                   free: "৩০০",   basic: "আনলিমিটেড", standard: "আনলিমিটেড", premium: "আনলিমিটেড" },
          { name: "ফাইল প্রতি ইমেজ স্টোরেজ",         free: "৫০০ কেবি",basic: "১ এমবি",   standard: "৫ এমবি",    premium: "আনলিমিটেড" },
          { name: "সাইজ ও কালার ভ্যারিয়েন্ট",         free: false,   basic: true,        standard: true,        premium: true        },
          { name: "ইএমআই ও কিস্তিতে বিক্রি",         free: false,   basic: true,        standard: true,        premium: true        },
          { name: "কোটেশন তৈরি",                   free: false,   basic: true,        standard: true,        premium: true        },
          { name: "ডেলিভারি চালান",                 free: false,   basic: true,        standard: true,        premium: true        },
          { name: "এক্সচেঞ্জ ও ট্রেড-ইন",             free: false,   basic: true,        standard: true,        premium: true        },
          { name: "অ্যাডভান্স বুকিং",                free: false,   basic: true,        standard: true,        premium: true        },
          { name: "কুইক বকেয়া এন্ট্রি",              free: false,   basic: true,        standard: true,        premium: true        },
        ],
      },
      {
        id: "inventory",
        icon: "📦",
        title: "ইনভেন্টরি ও স্টক",
        subtitle: "শেলফ থেকে সেল পর্যন্ত স্টকের পূর্ণ নিয়ন্ত্রণ",
        features: [
          { name: "স্টক রেজিস্টার ও স্টেটমেন্ট",    free: false,   basic: true,  standard: true,  premium: true  },
          { name: "স্টক অডিট ও পরীক্ষা",            free: false,   basic: true,  standard: true,  premium: true  },
          { name: "বারকোড প্রিন্টিং",              free: false,   basic: true,  standard: true,  premium: true  },
          { name: "ওয়্যারহাউস এন্ট্রি ও সার্চ",      free: false,   basic: true,  standard: true,  premium: true  },
          { name: "ওয়েট ইনটেক ও ডিডাকশন",         free: false,   basic: true,  standard: true,  premium: true  },
          { name: "সিরিয়াল ও ওয়ারেন্টি",           free: false,   basic: false, standard: true,  premium: true  },
          { name: "ওয়ারেন্টি টার্মস ও পিরিয়ড",       free: false,   basic: false, standard: true,  premium: true  },
          { name: "RMA ও রিটার্নস ব্যবস্থাপনা",       free: false,   basic: false, standard: true,  premium: true  },
          { name: "ব্যাচ ও এক্সপায়ারি ট্র্যাকিং",     free: false,   basic: false, standard: true,  premium: true  },
        ],
      },
      {
        id: "restaurant",
        icon: "🍽️",
        title: "রেস্তোরাঁ ও টেবিল",
        subtitle: "রেস্তোরাঁ ও ক্যাফে — কাউন্টার থেকে ডাইন-ইন",
        features: [
          { name: "টেবিল, KOT ও রেস্তোরাঁ অর্ডার", free: false, basic: false, standard: true, premium: true },
          { name: "ছবি ও প্রিপারেশন টাইমসহ QR মেনু", free: false, basic: false, standard: true, premium: true },
          { name: "কাউন্টার রেজিস্টার ও রিপোর্ট",   free: false, basic: false, standard: true, premium: true },
        ],
      },
      {
        id: "staff",
        icon: "👥",
        title: "এইচআর ও স্টাফ ম্যানেজমেন্ট",
        subtitle: "বেতন, উপস্থিতি ও টিম ম্যানেজমেন্ট",
        features: [
          { name: "স্টাফ স্যালারি",                  free: false, basic: true,  standard: true, premium: true },
          { name: "স্টাফ অ্যাটেনডেন্স",              free: false, basic: false, standard: true, premium: true },
          { name: "স্টাফ মান্থ রিভিউ",              free: false, basic: true,  standard: true, premium: true },
          { name: "ইনসেন্টিভ ও বোনাস",              free: false, basic: true,  standard: true, premium: true },
          { name: "সেলস রিপ্রেজেন্টেটিভ",            free: false, basic: true,  standard: true, premium: true },
          { name: "প্রোডাক্ট-ওয়াইজ কমিশন",          free: false, basic: true,  standard: true, premium: true },
          { name: "ট্রেডসম্যান কমিশন",              free: false, basic: true,  standard: true, premium: true },
          { name: "স্টাফ ডিসকাউন্ট ও প্রাইস লিমিট", free: false, basic: true,  standard: true, premium: true },
        ],
      },
      {
        id: "finance",
        icon: "💰",
        title: "ফাইন্যান্স ও ক্রেডিট",
        subtitle: "প্রথম দিন থেকেই আর্থিক স্বচ্ছতা",
        features: [
          { name: "ক্রেডিট রেজিস্টার ও বাকি",        free: false, basic: true,  standard: true, premium: true },
          { name: "চেক রেজিস্টার",                 free: false, basic: true,  standard: true, premium: true },
          { name: "কাস্টমার পোর্টাল",               free: false, basic: true,  standard: true, premium: true },
          { name: "লয়্যালটি পয়েন্টস",                free: false, basic: true,  standard: true, premium: true },
          { name: "রেফারেল কমিশন",                 free: false, basic: true,  standard: true, premium: true },
          { name: "ডিসকাউন্ট কুপন ও খরচ",           free: false, basic: true,  standard: true, premium: true },
          { name: "ক্যাপিটাল ও ইনভেস্টর",           free: false, basic: true,  standard: true, premium: true },
          { name: "লোন রেজিস্টার",                 free: false, basic: true,  standard: true, premium: true },
          { name: "এক্সপেন্স বাজেট",               free: false, basic: false, standard: true, premium: true },
          { name: "কাস্টমার-ওয়াইজ প্রফিট",         free: false, basic: false, standard: true, premium: true },
        ],
      },
      {
        id: "manufacturing",
        icon: "🏭",
        title: "প্রোডাকশন ও ম্যানুফ্যাকচারিং",
        subtitle: "রেসিপি থেকে ডেলিভারি পর্যন্ত ট্র্যাকিং",
        features: [
          { name: "বিল অফ মেটেরিয়ালস (রেসিপি)",    free: false, basic: true, standard: true, premium: true },
          { name: "দৈনিক প্রোডাকশন লগ",            free: false, basic: true, standard: true, premium: true },
          { name: "আগামীকালের প্রোডাকশন প্ল্যান",      free: false, basic: true, standard: true, premium: true },
          { name: "ইনগ্রেডিয়েন্ট মার্জিন ক্যালকুলেটর", free: false, basic: true, standard: true, premium: true },
          { name: "ব্যাচ চেক ও অডিট ট্রেইল",          free: false, basic: true, standard: true, premium: true },
          { name: "প্যাকেট লেবেল (ব্যাচ ও উপাদান)",  free: false, basic: true, standard: true, premium: true },
          { name: "লট ট্র্যাকিং ও রিকল লিস্ট",       free: false, basic: true, standard: true, premium: true },
        ],
      },
      {
        id: "analytics",
        icon: "📊",
        title: "টার্গেট ও অ্যানালিটিক্স",
        subtitle: "পরিসংখ্যান জানুন, লক্ষ্য অর্জন করুন",
        features: [
          { name: "কোম্পানির মাসিক টার্গেট",         free: false, basic: true,  standard: true, premium: true },
          { name: "বিলো-কোট সেলস অ্যালার্ট",         free: false, basic: true,  standard: true, premium: true },
          { name: "ডেলিভারি এরিয়া ও কালেকশন",       free: false, basic: true,  standard: true, premium: true },
          { name: "কুরিয়ার ট্র্যাকিং",              free: false, basic: true,  standard: true, premium: true },
          { name: "সার্ভিস জবস",                    free: false, basic: true,  standard: true, premium: true },
          { name: "মাল্টি-ব্রاঞ্চ ও স্টক ট্রান্সফার",  free: false, basic: false, standard: true, premium: true },
          { name: "হোয়াটসঅ্যাপ বিজনেস",             free: false, basic: false, standard: true, premium: true },
          { name: "এআই অ্যাসিস্ট্যান্ট",             free: false, basic: false, standard: true, premium: true },
        ],
      },
      {
        id: "enterprise",
        icon: "🚀",
        title: "এন্টারপ্রাইজ ও ইন্টিগ্রেশন",
        subtitle: "চেইন শপ, এন্টারপ্রাইজ অ্যাকাউন্ট ও ডেভেলপার",
        features: [
          { name: "API অ্যাক্সেস",                  free: false, basic: false, standard: false, premium: true },
          { name: "এডিটেবল SMS টেমপ্লেট",          free: false, basic: false, standard: false, premium: true },
          { name: "পুরানো খাতার ডাটা ইমপোর্ট",       free: false, basic: false, standard: false, premium: true },
          { name: "ডাটা ইমপোর্ট উইজার্ড (৫k+ আইটেম)",free: false, basic: false, standard: false, premium: true },
        ],
      },
    ];
  }

  // Default English
  return [
    {
      id: "core",
      icon: "🧾",
      title: "Core POS & Billing",
      subtitle: "Everything you need to start selling",
      features: [
        { name: "Monthly invoices",              free: "300",   basic: "Unlimited", standard: "Unlimited", premium: "Unlimited" },
        { name: "Image storage per file",        free: "500 KB",basic: "1 MB",      standard: "5 MB",      premium: "Unlimited" },
        { name: "Sizes & colors variants",       free: false,   basic: true,        standard: true,        premium: true        },
        { name: "Installment / EMI sales",       free: false,   basic: true,        standard: true,        premium: true        },
        { name: "Quotations",                    free: false,   basic: true,        standard: true,        premium: true        },
        { name: "Delivery challans",             free: false,   basic: true,        standard: true,        premium: true        },
        { name: "Exchange & trade-in",           free: false,   basic: true,        standard: true,        premium: true        },
        { name: "Advance bookings",              free: false,   basic: true,        standard: true,        premium: true        },
        { name: "Quick dues entry",              free: false,   basic: true,        standard: true,        premium: true        },
      ],
    },
    {
      id: "inventory",
      icon: "📦",
      title: "Inventory & Stock",
      subtitle: "Full control over your stock, from shelf to sale",
      features: [
        { name: "Stock register & statement",    free: false,   basic: true,  standard: true,  premium: true  },
        { name: "Stock audits",                  free: false,   basic: true,  standard: true,  premium: true  },
        { name: "Barcode printing",              free: false,   basic: true,  standard: true,  premium: true  },
        { name: "Warehouse entry & search",      free: false,   basic: true,  standard: true,  premium: true  },
        { name: "Weighed intake with deductions",free: false,   basic: true,  standard: true,  premium: true  },
        { name: "Serial & warranty",             free: false,   basic: false, standard: true,  premium: true  },
        { name: "Warranty terms & period",       free: false,   basic: false, standard: true,  premium: true  },
        { name: "RMA and returns",               free: false,   basic: false, standard: true,  premium: true  },
        { name: "Batch & expiry tracking",       free: false,   basic: false, standard: true,  premium: true  },
      ],
    },
    {
      id: "restaurant",
      icon: "🍽️",
      title: "Restaurant & Table",
      subtitle: "Built for F&B — from counter service to full dine-in",
      features: [
        { name: "Table, KOT & restaurant orders",free: false, basic: false, standard: true, premium: true },
        { name: "QR menu with photos & prep time",free: false,basic: false, standard: true, premium: true },
        { name: "Counter register & reports",    free: false,  basic: false, standard: true, premium: true },
      ],
    },
    {
      id: "staff",
      icon: "👥",
      title: "HR & Staff Management",
      subtitle: "Pay, track and grow your team",
      features: [
        { name: "Staff salary",                  free: false, basic: true,  standard: true, premium: true },
        { name: "Staff attendance",              free: false, basic: false, standard: true, premium: true },
        { name: "Staff month review",            free: false, basic: true,  standard: true, premium: true },
        { name: "Incentives",                    free: false, basic: true,  standard: true, premium: true },
        { name: "Sales representatives",         free: false, basic: true,  standard: true, premium: true },
        { name: "Per-product commission",        free: false, basic: true,  standard: true, premium: true },
        { name: "Tradesman standing commission", free: false, basic: true,  standard: true, premium: true },
        { name: "Staff discount & price limits", free: false, basic: true,  standard: true, premium: true },
      ],
    },
    {
      id: "finance",
      icon: "💰",
      title: "Finance & Credit",
      subtitle: "Full financial visibility from day one",
      features: [
        { name: "Credit register",               free: false, basic: true,  standard: true, premium: true },
        { name: "Cheque register",               free: false, basic: true,  standard: true, premium: true },
        { name: "Customer portal",               free: false, basic: true,  standard: true, premium: true },
        { name: "Loyalty points",                free: false, basic: true,  standard: true, premium: true },
        { name: "Referral commission",           free: false, basic: true,  standard: true, premium: true },
        { name: "Discount coupons & costs",      free: false, basic: true,  standard: true, premium: true },
        { name: "Capital & investors",           free: false, basic: true,  standard: true, premium: true },
        { name: "Loan register",                 free: false, basic: true,  standard: true, premium: true },
        { name: "Expense budgets",               free: false, basic: false, standard: true, premium: true },
        { name: "Customer-wise profits",         free: false, basic: false, standard: true, premium: true },
      ],
    },
    {
      id: "manufacturing",
      icon: "🏭",
      title: "Production & Manufacturing",
      subtitle: "From recipe to dispatch — full traceability",
      features: [
        { name: "Bill of materials (recipe/parts)",    free: false, basic: true, standard: true, premium: true },
        { name: "Daily production log",                free: false, basic: true, standard: true, premium: true },
        { name: "Tomorrow's production plan",          free: false, basic: true, standard: true, premium: true },
        { name: "Ingredient margin calculator",        free: false, basic: true, standard: true, premium: true },
        { name: "Batch checks & audit trail",          free: false, basic: true, standard: true, premium: true },
        { name: "Packet labels (batch, ingredients)",  free: false, basic: true, standard: true, premium: true },
        { name: "Lot tracking & recall list",          free: false, basic: true, standard: true, premium: true },
      ],
    },
    {
      id: "analytics",
      icon: "📊",
      title: "Targets & Analytics",
      subtitle: "Know your numbers, hit your goals",
      features: [
        { name: "Company monthly targets",             free: false, basic: true,  standard: true, premium: true },
        { name: "Sales below-quote alert",             free: false, basic: true,  standard: true, premium: true },
        { name: "Delivery areas & area collections",   free: false, basic: true,  standard: true, premium: true },
        { name: "Courier tracking",                    free: false, basic: true,  standard: true, premium: true },
        { name: "Service jobs",                        free: false, basic: true,  standard: true, premium: true },
        { name: "Multi-branch & stock transfer",       free: false, basic: false, standard: true, premium: true },
        { name: "WhatsApp Business",                   free: false, basic: false, standard: true, premium: true },
        { name: "AI assistant",                        free: false, basic: false, standard: true, premium: true },
      ],
    },
    {
      id: "enterprise",
      icon: "🚀",
      title: "Enterprise & Integration",
      subtitle: "For chains, enterprise accounts and developers",
      features: [
        { name: "API access",                    free: false, basic: false, standard: false, premium: true },
        { name: "Editable SMS templates",        free: false, basic: false, standard: false, premium: true },
        { name: "Old book records import",       free: false, basic: false, standard: false, premium: true },
        { name: "Data import wizard (5k+ items)",free: false, basic: false, standard: false, premium: true },
      ],
    },
  ];
}

// ── ADD-ONS ─────────────────────────────────────────────────────────────────
export function getLocalizedAddOns(lang = 'en') {
  if (lang === 'ar') {
    return [
      {
        name: "فرع إضافي",
        price: "33 ر.س / شهرياً",
        description: "إضافة موقع متجر آخر خارج حدود باقتك الحالية.",
        icon: "🏪",
      },
      {
        name: "مستخدم إضافي",
        price: "11 ر.س / شهرياً",
        description: "منح موظف إضافي حساب دخول آمن خاص به.",
        icon: "👤",
      },
      {
        name: "رسائل SMS إضافية",
        price: "0.04 ر.س / رسالة",
        description: "إرسال المزيد من تذكيرات الدفع والإشعارات.",
        icon: "💬",
      },
      {
        name: "ترحيل بيانات كبرى",
        price: "220 ر.س مرة واحدة",
        description: "استيراد أكثر من 5,000 منتج من نظامك القديم بوسطتنا.",
        icon: "🔄",
      },
      {
        name: "تقرير مخصص",
        price: "حسب الطلب",
        description: "تقارير مصممة حسب طلب الإدارة أو المحاسبين القانونيين.",
        icon: "📋",
      },
    ];
  }
  if (lang === 'bn') {
    return [
      {
        name: "অতিরিক্ত ব্রাঞ্চ",
        price: "SAR ৩৩ / মাস",
        description: "আপনার বর্তমান প্ল্যানের বাইরে নতুন শাখা যুক্ত করুন।",
        icon: "🏪",
      },
      {
        name: "অতিরিক্ত ইউজার",
        price: "SAR ১১ / মাস",
        description: "অতিরিক্ত কর্মীকে নিজস্ব সিকিউর লগইন সিস্টেম দিন।",
        icon: "👤",
      },
      {
        name: "অতিরিক্ত এসএমএস",
        price: "SAR ০.০৪ / এসএমএস",
        description: "প্ল্যান লিমিটের বাইরে অতিরিক্ত পেমেন্ট নোটিফিকেশন পাঠান।",
        icon: "💬",
      },
      {
        name: "লার্জ ডাটা মাইগ্রেশন",
        price: "SAR ২২০ এককালীন",
        description: "পুরানো সিস্টেমের ৫,০০০+ প্রোডাক্ট আমরা ইমপোর্ট করে দেব।",
        icon: "🔄",
      },
      {
        name: "কাস্টম রিপোর্ট",
        price: "অনুরোধ সাপেক্ষে",
        description: "অডিটর বা ম্যানেজমেন্টের চাহিদামতো তৈরি করা কাস্টম রিপোর্ট।",
        icon: "📋",
      },
    ];
  }
  return [
    {
      name: "Extra Branch",
      price: "SAR 33 / month",
      description: "Add another shop location beyond what your plan includes.",
      icon: "🏪",
    },
    {
      name: "Extra User",
      price: "SAR 11 / month",
      description: "Give an additional staff member their own secure login.",
      icon: "👤",
    },
    {
      name: "Extra SMS",
      price: "SAR 0.04 / SMS",
      description: "Send more payment reminders and notifications than your plan allows.",
      icon: "💬",
    },
    {
      name: "Large Data Migration",
      price: "SAR 220 one-time",
      description: "Import over 5,000 products from your old system — we handle it for you.",
      icon: "🔄",
    },
    {
      name: "Custom Report",
      price: "On request",
      description: "Reports built exactly in your format for auditors or management.",
      icon: "📋",
    },
  ];
}

// Backward-compatible exports defaulting to English
export const plans = getLocalizedPlans('en');
export const featureGroups = getLocalizedFeatureGroups('en');
export const addOns = getLocalizedAddOns('en');
