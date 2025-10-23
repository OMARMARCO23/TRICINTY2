// Simple in-app i18n without extra deps
const messages = {
  en: {
    nav: { dashboard: 'Dashboard', history: 'History', coach: 'AI Coach', settings: 'Settings' },
    dashboard: {
      predictedTitle: 'If you keep this pace',
      range: 'Range',
      currentUsage: 'Current Usage',
      dailyTrend: 'Daily Trend',
      avgSoFar: 'Avg so far',
      actualBill: 'Actual Bill',
      insights: 'Insights',
      daysLeft: 'Days left this month',
      targetHint: 'Target about {dailyTarget} kWh/day to stay under {goal} {currency}.',
      toNextTier: '{kwh} kWh to next price tier.',
      scanMeter: 'Scan Meter (Camera)',
      addReading: 'Add Reading',
      recentActivity: 'Recent Activity',
      scanModalTitle: 'Scan Meter',
      addModalTitle: 'Add New Meter Reading',
      lastReading: 'Last reading',
      cancel: 'Cancel',
      save: 'Save'
    },
    aiInsight: {
      title: 'AI Insight',
      refresh: 'Refresh',
      thinking: 'Thinking...',
      spike: 'We detected a consumption increase of {percent}% compared to recent days.',
      getTip: 'Get a quick, personalized tip based on your current trend.'
    },
    coach: {
      scanBill: 'Scan Bill (OCR)',
      prompt1: 'Why did my consumption increase this week?',
      prompt2: 'Give me 3 low-cost tips to lower my bill.',
      prompt3: 'How to stay under my monthly goal?',
      prompt4: 'What could be using the most energy at home?',
      inputPH: 'Ask how to reduce your bill...'
    },
    settings: {
      title: 'Settings',
      theme: 'Theme',
      themeAuto: 'Auto (follow system)',
      themeLight: 'Light',
      themeDark: 'Dark',
      language: 'Language',
      country: 'Country (Tariffs)',
      tariffMode: 'Tariff Mode',
      tariffModeProg: 'Progressive blocks',
      tariffModeWhole: 'Whole-tier (all kWh at reached tier)',
      goal: 'Monthly Spending Goal ({currency})',
      legalTitle: 'Legal & Info',
      about: 'About',
      aboutText: 'TRICINTY is an app to help you track and reduce your electricity consumption. For a full-screen, app-like experience, install TRICINTY to your device\'s home screen using your browser\'s "Add to Home Screen" option.',
      privacy: 'Privacy Policy',
      privacyText: 'Your data is stored locally on your device and is not shared with any third parties. We do not collect any personal information.',
      disclaimer: 'Disclaimer',
      disclaimerText: 'Bill predictions and consumption are estimates for information only. Actual results may vary. We are not responsible for discrepancies.'
    }
  },
  fr: {
    nav: { dashboard: 'Tableau', history: 'Historique', coach: 'Coach IA', settings: 'Paramètres' },
    dashboard: {
      predictedTitle: 'Si vous gardez ce rythme',
      range: 'Fourchette',
      currentUsage: 'Consommation actuelle',
      dailyTrend: 'Tendance quotidienne',
      avgSoFar: 'Moy. actuelle',
      actualBill: 'Facture actuelle',
      insights: 'Aperçus',
      daysLeft: 'Jours restants ce mois-ci',
      targetHint: 'Visez ~{dailyTarget} kWh/jour pour rester sous {goal} {currency}.',
      toNextTier: '{kwh} kWh avant le palier suivant.',
      scanMeter: 'Scanner le compteur (Caméra)',
      addReading: 'Ajouter un relevé',
      recentActivity: 'Activité récente',
      scanModalTitle: 'Scanner le compteur',
      addModalTitle: 'Ajouter un nouveau relevé',
      lastReading: 'Dernier relevé',
      cancel: 'Annuler',
      save: 'Enregistrer'
    },
    aiInsight: {
      title: 'Conseil IA',
      refresh: 'Actualiser',
      thinking: 'Réflexion...',
      spike: 'Nous avons détecté une hausse de {percent}% par rapport aux derniers jours.',
      getTip: 'Obtenez un conseil personnalisé selon votre tendance actuelle.'
    },
    coach: {
      scanBill: 'Scanner la facture (OCR)',
      prompt1: 'Pourquoi ma consommation a-t-elle augmenté cette semaine ?',
      prompt2: 'Donnez-moi 3 conseils peu coûteux pour réduire ma facture.',
      prompt3: 'Comment rester sous mon objectif mensuel ?',
      prompt4: 'Qu’est-ce qui consomme le plus d’énergie à la maison ?',
      inputPH: 'Demandez comment réduire votre facture...'
    },
    settings: {
      title: 'Paramètres',
      theme: 'Thème',
      themeAuto: 'Auto (suivre le système)',
      themeLight: 'Clair',
      themeDark: 'Sombre',
      language: 'Langue',
      country: 'Pays (Tarifs)',
      tariffMode: 'Mode de tarification',
      tariffModeProg: 'Par paliers',
      tariffModeWhole: 'Palier atteint (tous kWh)',
      goal: 'Budget mensuel ({currency})',
      legalTitle: 'Informations légales',
      about: 'À propos',
      aboutText: 'TRICINTY vous aide à suivre et réduire votre consommation d’électricité. Pour une expérience plein écran, installez l’app sur l’écran d’accueil via "Ajouter à l’écran d’accueil".',
      privacy: 'Politique de confidentialité',
      privacyText: 'Vos données sont stockées localement sur votre appareil et ne sont partagées avec aucun tiers. Nous ne collectons aucune donnée personnelle.',
      disclaimer: 'Avertissement',
      disclaimerText: 'Les prévisions et consommations sont des estimations à titre informatif. Les résultats réels peuvent varier. Aucune responsabilité en cas d’écarts.'
    }
  },
  ar: {
    nav: { dashboard: 'الرئيسية', history: 'السجل', coach: 'المدرب الذكي', settings: 'الإعدادات' },
    dashboard: {
      predictedTitle: 'إذا واصلت بهذا الإيقاع',
      range: 'النطاق',
      currentUsage: 'الاستهلاك الحالي',
      dailyTrend: 'الاتجاه اليومي',
      avgSoFar: 'المتوسط حتى الآن',
      actualBill: 'الفاتورة الحالية',
      insights: 'مؤشرات',
      daysLeft: 'الأيام المتبقية هذا الشهر',
      targetHint: 'للبقاء تحت {goal} {currency} استهدف حوالي {dailyTarget} ك.و.س/يوم.',
      toNextTier: '{kwh} ك.و.س للوصول إلى الشريحة التالية.',
      scanMeter: 'مسح العداد (الكاميرا)',
      addReading: 'إضافة قراءة',
      recentActivity: 'النشاط الأخير',
      scanModalTitle: 'مسح العداد',
      addModalTitle: 'إضافة قراءة جديدة',
      lastReading: 'آخر قراءة',
      cancel: 'إلغاء',
      save: 'حفظ'
    },
    aiInsight: {
      title: 'نصيحة الذكاء الاصطناعي',
      refresh: 'تحديث',
      thinking: 'يجري التفكير...',
      spike: 'اكتشفنا زيادة بنسبة {percent}% مقارنةً بالأيام الأخيرة.',
      getTip: 'احصل على نصيحة سريعة مخصّصة وفق اتجاهك الحالي.'
    },
    coach: {
      scanBill: 'مسح الفاتورة (OCR)',
      prompt1: 'لماذا زاد استهلاكي هذا الأسبوع؟',
      prompt2: 'أعطني 3 نصائح قليلة التكلفة لخفض الفاتورة.',
      prompt3: 'كيف أبقى ضمن هدفي الشهري؟',
      prompt4: 'ما أكثر الأجهزة استهلاكًا للطاقة في المنزل؟',
      inputPH: 'اسأل كيف تخفّض فاتورتك...'
    },
    settings: {
      title: 'الإعدادات',
      theme: 'المظهر',
      themeAuto: 'تلقائي (حسب النظام)',
      themeLight: 'فاتح',
      themeDark: 'داكن',
      language: 'اللغة',
      country: 'الدولة (التعريفات)',
      tariffMode: 'وضع التعرفة',
      tariffModeProg: 'تدرّج الشرائح',
      tariffModeWhole: 'تعرفة الشريحة كاملة',
      goal: 'الميزانية الشهرية ({currency})',
      legalTitle: 'معلومات قانونية',
      about: 'عن التطبيق',
      aboutText: 'TRICINTY يساعدك على متابعة وتقليل استهلاك الكهرباء. للحصول على تجربة كتطبيق، ثبّت TRICINTY على الشاشة الرئيسية عبر "إضافة إلى الشاشة الرئيسية".',
      privacy: 'سياسة الخصوصية',
      privacyText: 'بياناتك محفوظة محليًا على جهازك ولا نشاركها مع أي طرف ثالث. لا نجمع معلومات شخصية.',
      disclaimer: 'إخلاء المسؤولية',
      disclaimerText: 'التوقعات والاستهلاك تقديرات لأغراض المعلومات فقط وقد تختلف النتائج الفعلية. لسنا مسؤولين عن أي فروقات.'
    }
  }
};

// Helper to get nested value by "a.b.c" path
function getNested(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

export function tFactory(lang = 'en') {
  const dict = messages[lang] || messages.en;
  return (key, vars) => {
    let s = getNested(dict, key);
    if (s === undefined) {
      // fallback to English
      s = getNested(messages.en, key) ?? key;
    }
    if (vars && typeof s === 'string') {
      s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
    }
    return s;
  };
}
