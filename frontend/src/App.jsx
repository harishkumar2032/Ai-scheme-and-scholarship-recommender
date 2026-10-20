import { useEffect, useMemo, useRef, useState } from 'react';

const FALLBACK_SCHEMES = [
  {
    id: 1,
    name: 'Central Sector Scheme of Scholarship for College and University Students',
    type: 'Scholarship',
    target: 'STUDENT',
    department: 'Department of Higher Education',
    state: 'ALL',
    level: 'CENTRAL',
    match: 94,
    eligible: true,
    benefit: 'Scholarship assistance subject to current scheme rules.',
    summary: 'Higher-education students meeting the current merit and other notified conditions.',
    docs: ['Aadhaar', 'Income Certificate', 'Academic Marksheet', 'College Admission Proof'],
    deadline: 'Rolling / Notified Portal Dates',
    sourceUrl: 'https://scholarships.gov.in/',
    verified: true,
  },
  {
    id: 31,
    name: 'Tamil Nadu Pudhumai Penn Scheme',
    type: 'Education Support',
    target: 'STUDENT',
    department: 'Government of Tamil Nadu',
    state: 'TAMIL_NADU',
    level: 'STATE',
    match: 91,
    eligible: true,
    benefit: 'Monthly DBT support subject to current notifications.',
    summary: 'Higher-education incentive for eligible girl students from specified school backgrounds.',
    docs: ['School Study Certificate', 'Aadhaar Card', 'Bank Passbook', 'College ID'],
    deadline: 'State Portal Notification',
    sourceUrl: 'https://tils.tn.gov.in/schemes',
    verified: true,
  },
  {
    id: 51,
    name: 'Prime Minister Employment Generation Programme (PMEGP)',
    type: 'MSME/Credit',
    target: 'COMPANY',
    department: 'Ministry of MSME',
    state: 'ALL',
    level: 'CENTRAL',
    match: 88,
    eligible: true,
    benefit: 'Margin-money subsidy/credit-linked support subject to current guidelines.',
    summary: 'Credit-linked support for setting up eligible micro enterprises and employment generation.',
    docs: ['Udyam Certificate', 'Project Report', 'Identity Proof', 'Bank Account Details'],
    deadline: 'Active Throughout Year',
    sourceUrl: 'https://msme.gov.in/',
    verified: true,
  },
  {
    id: 73,
    name: 'Startup India Seed Fund Scheme',
    type: 'Startup/Funding',
    target: 'COMPANY',
    department: 'DPIIT',
    state: 'ALL',
    level: 'CENTRAL',
    match: 86,
    eligible: true,
    benefit: 'Seed support subject to current guidelines and selection.',
    summary: 'Financial assistance for proof of concept, prototype, product trials, and market entry.',
    docs: ['DPIIT Recognition', 'Pitch Deck', 'Business Registration', 'Audited Accounts'],
    deadline: 'Open Portal Submissions',
    sourceUrl: 'https://www.startupindia.gov.in/',
    verified: true,
  },
];

const quickPrompts = [
  'Find scholarships for students in Tamil Nadu',
  'What Central MSME and startup subsidies are available?',
  'Show me schemes for students with disabilities',
];

const studentFields = [
  { label: 'Age', type: 'number', key: 'age', required: true },
  { label: 'Gender', type: 'select', key: 'gender', options: ['Female', 'Male', 'Other'], required: true },
  { label: 'State', type: 'text', key: 'state', required: true },
  { label: 'District', type: 'text', key: 'district' },
  { label: 'Education Level', type: 'select', key: 'education_level', options: ['UG', 'PG', 'Diploma', 'Doctorate', 'School'], required: true },
  { label: 'Course', type: 'text', key: 'course', required: true },
  { label: 'College / Institute', type: 'text', key: 'college' },
  { label: 'Year / Semester', type: 'text', key: 'year_semester' },
  { label: 'CGPA / Percentage', type: 'number', step: '0.01', key: 'marks_or_cgpa', required: true },
  { label: 'Family Annual Income (₹)', type: 'number', key: 'family_income', required: true },
  { label: 'Social Category', type: 'select', key: 'category', options: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority'], required: true },
  { label: 'Disability Status', type: 'select', key: 'disability_status', options: ['None', 'PWD', 'Temporary Disability'] },
  { label: 'Location Background', type: 'select', key: 'rural_urban', options: ['Rural', 'Urban'] },
  { label: 'Parent Occupation', type: 'text', key: 'parent_occupation' },
  { label: 'First Generation Graduate', type: 'select', key: 'first_generation', options: ['Yes', 'No'] },
  { label: 'Hosteller / Day Scholar', type: 'select', key: 'hosteller', options: ['Hosteller', 'Day Scholar'] },
  { label: 'College Type', type: 'select', key: 'college_type', options: ['Government', 'Private'] },
];

const CIN_SAMPLE_LIST = [
  { cin: 'L22210MH1995PLC084781', name: 'Tata Consultancy Services (TCS)', state: 'Maharashtra' },
  { cin: 'U72900TN2020PTC135001', name: 'Aura Tech (Software)', state: 'Tamil Nadu' },
  { cin: 'U01100TN2018PTC122450', name: 'Kaveri Agrotech (Agri)', state: 'Tamil Nadu' },
  { cin: 'U24230MH2019PTC320114', name: 'Zenith Biopharma (Health)', state: 'Maharashtra' },
  { cin: 'U29309TN2021PTC142890', name: 'Surya Defence (Defence/UAV)', state: 'Tamil Nadu' },
  { cin: 'L72200DL2015PLC285670', name: 'InfoSystem Global (Listed)', state: 'Delhi' },
];

const validateCINClient = (cinStr) => {
  const clean = (cinStr || '').trim().toUpperCase();
  if (!clean) return { valid: false, message: 'Please enter a 21-character CIN.' };
  if (clean.length !== 21) {
    return { valid: false, message: `CIN must be exactly 21 characters (currently ${clean.length}).` };
  }
  const regex = /^([UL])([0-9]{5})([A-Z]{2})([0-9]{4})([A-Z]{3})([0-9]{6})$/;
  const match = clean.match(regex);
  if (!match) {
    return {
      valid: false,
      message: 'Invalid format. Standard Indian CIN: [U/L][5-digit-NIC][2-letter-State][4-digit-Year][3-letter-Type][6-digit-RegNo]',
    };
  }
  return {
    valid: true,
    listing: match[1] === 'L' ? 'Listed' : 'Unlisted',
    nic: match[2],
    stateCode: match[3],
    year: match[4],
    typeCode: match[5],
    regNo: match[6],
  };
};

const companyFields = [
  { label: 'CIN (Corporate ID)', type: 'text', key: 'cin', required: true, category: 'verified' },
  { label: 'Company / Legal Name', type: 'text', key: 'company_name', required: true, category: 'verified' },
  { label: 'Company Type', type: 'select', key: 'company_type', options: ['Private Limited', 'Public Limited', 'Partnership', 'Proprietorship', 'LLP'], required: true, category: 'verified' },
  { label: 'Date of Incorporation', type: 'date', key: 'incorporation_date', category: 'verified' },
  { label: 'Company Status', type: 'select', key: 'company_status', options: ['ACTIVE', 'DORMANT', 'UNDER PROCESS', 'CLOSED'], category: 'verified' },
  { label: 'Registered RoC Office', type: 'text', key: 'roc_code', category: 'verified' },
  { label: 'Registered State', type: 'text', key: 'state', required: true, category: 'verified' },
  { label: 'Registered City / District', type: 'text', key: 'district', category: 'verified' },
  { label: 'Authorized Share Capital (₹)', type: 'number', key: 'authorized_capital', category: 'verified' },
  { label: 'Paid-Up Share Capital (₹)', type: 'number', key: 'paid_up_capital', category: 'verified' },
  { label: 'Registered Address', type: 'text', key: 'registered_address', category: 'verified' },
  { label: 'Industry Sector', type: 'select', key: 'industry', options: ['Software', 'Manufacturing', 'IT Services', 'Startup', 'Biotechnology', 'Defence', 'Agriculture', 'Food Processing'], required: true, category: 'operational' },
  { label: 'Business Activity', type: 'text', key: 'business_activity', category: 'operational' },
  { label: 'MSME / Udyam Certified', type: 'select', key: 'msme_status', options: ['Yes', 'No'], required: true, category: 'operational' },
  { label: 'Udyam Registration No.', type: 'text', key: 'udyam_registration_number', placeholder: 'UDYAM-TN-01-0000000', category: 'operational' },
  { label: 'DPIIT Startup Recognized', type: 'select', key: 'startup_status', options: ['Yes', 'No'], category: 'operational' },
  { label: 'DPIIT Recognition No.', type: 'text', key: 'dpiit_recognition_number', placeholder: 'DIPP12345', category: 'operational' },
  { label: 'Annual Turnover (₹)', type: 'number', key: 'annual_turnover', required: true, category: 'operational' },
  { label: 'Total Employee Count', type: 'number', key: 'employee_count', category: 'operational' },
  { label: 'Export Activity Active', type: 'select', key: 'export_status', options: ['Yes', 'No'], category: 'operational' },
];

const parseProfileToForm = (data, role) => {
  if (!data) return {};
  if (role === 'student') {
    return {
      age: data.age ?? '',
      gender: data.gender ?? '',
      state: data.state ?? '',
      district: data.district ?? '',
      education_level: data.education_level ?? '',
      course: data.course ?? '',
      college: data.college ?? '',
      year_semester: data.year_semester ?? '',
      marks_or_cgpa: data.marks_or_cgpa ?? '',
      family_income: data.family_income ?? '',
      category: data.category ?? '',
      disability_status: data.disability_status ?? '',
      rural_urban: data.rural_urban ?? '',
      parent_occupation: data.parent_occupation ?? '',
      first_generation: data.first_generation ? 'Yes' : 'No',
      hosteller: data.hosteller ? 'Hosteller' : 'Day Scholar',
      college_type: data.college_type ?? '',
    };
  }

  return {
    cin: data.cin ?? '',
    legal_name: data.legal_name ?? data.company_name ?? '',
    company_name: data.company_name ?? data.legal_name ?? '',
    company_type: data.company_type ?? 'Private Limited',
    company_category: data.company_category ?? '',
    company_subcategory: data.company_subcategory ?? '',
    company_class: data.company_class ?? '',
    roc_code: data.roc_code ?? '',
    industry: data.industry ?? '',
    business_activity: data.business_activity ?? '',
    state: data.registered_state ?? data.state ?? '',
    district: data.registered_city ?? data.district ?? '',
    registered_address: data.registered_address ?? '',
    authorized_capital: data.authorized_capital ?? '',
    paid_up_capital: data.paid_up_capital ?? '',
    incorporation_date: data.incorporation_date ?? '',
    company_status: data.company_status ?? 'ACTIVE',
    employee_count: data.employee_count ?? '',
    msme_status: data.msme_status ? 'Yes' : 'No',
    udyam_registration_number: data.udyam_registration_number ?? '',
    startup_status: data.startup_status ? 'Yes' : 'No',
    dpiit_recognition_number: data.dpiit_recognition_number ?? '',
    annual_turnover: data.annual_turnover ?? '',
    export_status: data.export_status ? 'Yes' : 'No',
    data_source: data.data_source ?? '',
    verification_status: data.verification_status ?? 'UNVERIFIED',
  };
};

const buildPayload = (values, role) => {
  if (role === 'student') {
    return {
      age: values.age ? Number(values.age) : null,
      gender: values.gender || '',
      state: values.state || '',
      district: values.district || '',
      education_level: values.education_level || '',
      course: values.course || '',
      college: values.college || '',
      year_semester: values.year_semester || '',
      marks_or_cgpa: values.marks_or_cgpa ? Number(values.marks_or_cgpa) : null,
      family_income: values.family_income ? Number(values.family_income) : null,
      category: values.category || '',
      disability_status: values.disability_status || '',
      rural_urban: values.rural_urban || '',
      parent_occupation: values.parent_occupation || '',
      first_generation: values.first_generation === 'Yes',
      hosteller: values.hosteller === 'Hosteller',
      college_type: values.college_type || '',
    };
  }

  return {
    cin: values.cin || '',
    legal_name: values.legal_name || values.company_name || '',
    company_name: values.company_name || values.legal_name || '',
    company_type: values.company_type || '',
    company_category: values.company_category || '',
    company_subcategory: values.company_subcategory || '',
    company_class: values.company_class || '',
    roc_code: values.roc_code || '',
    industry: values.industry || '',
    business_activity: values.business_activity || '',
    state: values.state || '',
    district: values.district || '',
    registered_address: values.registered_address || '',
    authorized_capital: values.authorized_capital ? Number(values.authorized_capital) : null,
    paid_up_capital: values.paid_up_capital ? Number(values.paid_up_capital) : null,
    incorporation_date: values.incorporation_date || null,
    company_status: values.company_status || 'ACTIVE',
    employee_count: values.employee_count ? Number(values.employee_count) : null,
    msme_status: values.msme_status === 'Yes',
    udyam_registration_number: values.udyam_registration_number || '',
    startup_status: values.startup_status === 'Yes',
    dpiit_recognition_number: values.dpiit_recognition_number || '',
    annual_turnover: values.annual_turnover ? Number(values.annual_turnover) : null,
    export_status: values.export_status === 'Yes',
    data_source: values.data_source || '',
    verification_status: values.verification_status || 'UNVERIFIED',
  };
};

const normalizeScheme = (scheme, index) => {
  const name = scheme.scheme_name || scheme.name || `Scheme ${index + 1}`;
  const match = Math.round(Number(scheme.match_score ?? scheme.match ?? 0));
  const docs = scheme.documents || [
    'Aadhaar / ID Proof',
    'Category / Income Certificate (if applicable)',
    'Academic / Registration Proof',
  ];

  const eligStatus = scheme.eligibility_status || (scheme.eligible ? 'ELIGIBLE' : 'UNDER_REVIEW');
  const eligStatusLabel = scheme.eligibility_status_label || (
    eligStatus === 'ELIGIBLE'
      ? 'Eligible based on available information'
      : eligStatus === 'POTENTIALLY_ELIGIBLE'
      ? 'Potentially eligible'
      : eligStatus === 'NEEDS_VERIFICATION'
      ? 'Eligibility needs verification'
      : eligStatus === 'NOT_ELIGIBLE'
      ? 'Not eligible based on criteria'
      : 'Under review'
  );

  return {
    id: scheme.recommendation_id ?? scheme.scheme_id ?? scheme.id ?? index + 1,
    name,
    type: scheme.scheme_type || 'Government Scheme',
    target: (scheme.target_user || 'ALL').toUpperCase(),
    department: scheme.department || 'Government Department',
    state: scheme.state || 'ALL',
    level: scheme.government_level || 'CENTRAL',
    match: match > 0 ? match : 85,
    eligible: eligStatus !== 'NOT_ELIGIBLE',
    eligibilityStatus: eligStatus,
    eligibilityStatusLabel: eligStatusLabel,
    relevanceExplanation: scheme.relevance_explanation || '',
    unmetConditions: scheme.unmet_conditions || [],
    verificationItems: scheme.verification_items || [],
    benefit: scheme.benefit || scheme.benefits || 'Financial assistance subject to current guidelines.',
    summary: scheme.relevance_explanation || (Array.isArray(scheme.reasons) && scheme.reasons.length
      ? scheme.reasons.join(' ')
      : (scheme.eligibility || scheme.eligibility_summary || scheme.description || 'Verified eligible for applicant profile.')),
    description: scheme.description || '',
    docs,
    deadline: scheme.deadline || 'Active (Continuous enrollment)',
    sourceUrl: scheme.source_url || scheme.official_portal || 'https://scholarships.gov.in/',
    verified: scheme.verification_status !== 'REJECTED',
  };
};

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const requestJson = async (path, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const csrfToken = getCookie('csrftoken');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(path, {
    credentials: 'include',
    headers,
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    let detail = 'Request failed';
    if (typeof payload === 'object') {
      detail = payload.message || payload.detail || Object.values(payload).flat().join(' ') || JSON.stringify(payload);
    } else {
      detail = payload;
    }
    const err = new Error(detail);
    err.payload = typeof payload === 'object' ? payload : {};
    err.status = response.status;
    throw err;
  }

  return payload;
};

// Rich Markdown and Inline Parser for AI Assistant
function renderFormattedInline(str) {
  if (!str) return '';
  const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g;
  const parts = str.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="copilot-markdown-link"
        >
          {linkMatch[1]} ↗
        </a>
      );
    }
    return part;
  });
}

function renderCopilotMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={i}>
          {renderFormattedInline(line.slice(5))}
        </h4>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i}>
          {renderFormattedInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <div key={i} className="copilot-markdown-quote">
          {renderFormattedInline(line.slice(2))}
        </div>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="copilot-markdown-list-item">
          <span className="copilot-markdown-list-bullet">✦</span>
          <span>{renderFormattedInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      elements.push(
        <div key={i} className="copilot-markdown-list-item">
          <span className="copilot-markdown-list-bullet">{match[1]}.</span>
          <span>{renderFormattedInline(match[2])}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: '4px' }} />);
    } else {
      elements.push(
        <p key={i} style={{ margin: '4px 0' }}>
          {renderFormattedInline(line)}
        </p>
      );
    }
  }

  return <div className="copilot-markdown">{elements}</div>;
}

export default function App() {
  // Session & Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('scheme_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authRole, setAuthRole] = useState('student'); // 'student' | 'company'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authStatus, setAuthStatus] = useState({ text: '', type: '' });

  // Main App Navigation State
  const [activeView, setActiveView] = useState('dash'); // 'dash', 'catalog', 'profile', 'copilot'
  const [schemes, setSchemes] = useState(FALLBACK_SCHEMES);
  const [catalogSchemes, setCatalogSchemes] = useState([]);
  const [directoryFilter, setDirectoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState({ text: '', type: '' });
  const [dashboardAlert, setDashboardAlert] = useState({ text: '', type: '' });

  // Profile data stored for the authenticated user
  const [profileData, setProfileData] = useState({});

  // CIN Lookup & Multi-Step Verification State
  const [cinInput, setCinInput] = useState('');
  const [cinValidation, setCinValidation] = useState(null);
  const [cinLookupLoading, setCinLookupLoading] = useState(false);
  const [cinLookupResult, setCinLookupResult] = useState(null);
  const [cinLookupAlert, setCinLookupAlert] = useState({ text: '', type: '' });
  const [cinStep, setCinStep] = useState(1); // 1: Lookup, 2: Preview, 3: Enrich, 4: Recs

  // AI Copilot Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState([
    'What scholarships are available for students in Tamil Nadu?',
    'Tell me about MSME subsidies and startup seed funds',
    'Show schemes for girl students and women empowerment',
    'What documents do I need to apply for schemes?',
  ]);
  const [copilotMatchedSchemes, setCopilotMatchedSchemes] = useState([]);
  const [isCopilotDrawerOpen, setIsCopilotDrawerOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const chatEndRef = useRef(null);
  const drawerChatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const userRole = currentUser?.user_type || authRole;

  // Active fields and required eligibility fields calculation
  const activeProfileFields = userRole === 'company' ? companyFields : studentFields;
  const requiredFields = useMemo(() => activeProfileFields.filter((f) => f.required), [activeProfileFields]);
  const filledRequiredCount = useMemo(() => {
    return requiredFields.filter((f) => {
      const val = profileData[f.key];
      return val !== undefined && val !== null && String(val).trim() !== '';
    }).length;
  }, [requiredFields, profileData]);

  const isAllRequiredFilled = requiredFields.length > 0 && filledRequiredCount === requiredFields.length;

  // Verify and sync authenticated user session with backend on initial load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await requestJson('/api/users/me/');
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('scheme_user', JSON.stringify(data.user));
        } else {
          setCurrentUser(null);
          localStorage.removeItem('scheme_user');
        }
      } catch (err) {
        // If session check fails and we have no cached user, ensure clean state
        if (!localStorage.getItem('scheme_user')) {
          setCurrentUser(null);
        }
      }
    };
    checkSession();
  }, []);

  // Fetch catalog of all 500 schemes
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const data = await requestJson('/api/schemes/');
        const items = Array.isArray(data) ? data : data.results || [];
        if (items.length > 0) {
          const normalized = items.map(normalizeScheme);
          setCatalogSchemes(normalized);
        }
      } catch (err) {
        console.warn('Could not fetch catalog directly:', err);
      }
    };
    fetchCatalog();
  }, []);

  // When user is authenticated, load their stored profile data and recommendations
  useEffect(() => {
    if (!currentUser) {
      setProfileData({});
      setSchemes(FALLBACK_SCHEMES);
      return;
    }

    const loadUserData = async () => {
      setIsLoading(true);
      try {
        // 1. Load user stored profile data from database
        const profileEndpoint = currentUser.user_type === 'company' ? '/api/companies/me/' : '/api/students/me/';
        try {
          const profileRes = await requestJson(profileEndpoint);
          if (profileRes) {
            setProfileData(parseProfileToForm(profileRes, currentUser.user_type));
          }
        } catch (profileErr) {
          console.warn('Profile fetch error:', profileErr);
        }

        // 2. Generate and load personalized recommendations
        try {
          const recData = await requestJson('/api/recommendations/generate/', {
            method: 'POST',
            body: JSON.stringify({}),
          });
          const nextSchemes = (recData.results || []).map(normalizeScheme);
          setSchemes(nextSchemes.length ? nextSchemes : FALLBACK_SCHEMES);
        } catch (recErr) {
          console.warn('Recommendation generation error:', recErr);
          setSchemes(FALLBACK_SCHEMES);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  // Dynamic Chat History & Welcome Sync
  useEffect(() => {
    if (!currentUser) return;
    const syncCopilotChat = async () => {
      try {
        const data = await requestJson('/api/ai-copilot/history/');
        if (data && Array.isArray(data.history) && data.history.length > 0) {
          setChatMessages(
            data.history.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: m.created_at,
            }))
          );
          return;
        }
      } catch (e) {
        console.warn('Could not sync chat history:', e);
      }

      const roleText = currentUser.user_type === 'company' ? 'Enterprise / MSME' : 'Student';
      const contextHint =
        currentUser.user_type === 'company'
          ? 'I can find MSME subsidies, startup seed funds, PMEGP grants, and export incentives matching your company profile.'
          : 'I can search scholarships, fellowships, and education support schemes that match your academic background and profile.';

      setChatMessages([
        {
          id: 'welcome-' + currentUser.id,
          role: 'assistant',
          content: `### 👋 Welcome, **${currentUser.username}**!\n\nYou are signed in as a **${roleText}** user. ${contextHint}\n\nAsk me anything — I analyze all 500 verified government schemes against your stored profile in real-time. Type, speak, or select a topic to get started!`,
          createdAt: new Date().toISOString(),
        },
      ]);
      setCopilotMatchedSchemes([]);
    };

    syncCopilotChat();
  }, [currentUser]);

  // Voice Input (Web Speech Recognition)
  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Try Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join('');
        setChatInput(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsListening(false);
    }
  };

  // Text-to-Speech (Web Speech Synthesis)
  const speakMessage = (msgId, text) => {
    if (!window.speechSynthesis) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = (text || '')
      .replace(/[#*`>]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Copy Message to Clipboard
  const copyMessageContent = async (msgId, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  // Unified Message Dispatch
  const handleSendChatMessage = async (msgText) => {
    const msg = (typeof msgText === 'string' ? msgText : chatInput).trim();
    if (!msg || chatLoading) return;
    setChatInput('');

    const userMsg = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      drawerChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const data = await requestJson('/api/ai-copilot/chat/', {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      });

      const assistantMsg = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: data.reply,
        matchedSchemes: data.matched_schemes || [],
        createdAt: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
      if (data.suggested_actions?.length) {
        setChatSuggestions(data.suggested_actions);
      }
      if (data.matched_schemes?.length) {
        setCopilotMatchedSchemes(data.matched_schemes);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: `### ⚠️ Connection Notice\nCould not reach the AI copilot engine: ${err.message}. Please try again.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        drawerChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  };

  // Handle Login & Registration Submit
  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    const username = authUsername.trim();
    const password = authPassword;
    const email = authEmail.trim();

    if (!username || !password) {
      setAuthStatus({ text: 'Please enter both username and password.', type: 'error' });
      return;
    }

    if (authMode === 'register' && password.length < 8) {
      setAuthStatus({ text: 'Password must be at least 8 characters long.', type: 'error' });
      return;
    }

    try {
      setIsLoading(true);
      setAuthStatus({ text: '', type: '' });
      const endpoint = authMode === 'register' ? '/api/users/register/' : '/api/users/login/';
      const payload = authMode === 'register'
        ? { username, email, password, user_type: authRole }
        : { username, password };

      const data = await requestJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const user = data.user || data;
      setCurrentUser(user);
      localStorage.setItem('scheme_user', JSON.stringify(user));
      setAuthStatus({ text: authMode === 'register' ? 'Account created successfully!' : 'Login successful!', type: 'success' });
      setActiveView('dash');
    } catch (error) {
      setAuthStatus({ text: error.message || 'Authentication failed. Please check your credentials.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Quick helper to fill and submit demo credentials
  const handleQuickDemoLogin = (roleType) => {
    setAuthMode('login');
    setAuthRole(roleType);
    setAuthUsername(roleType === 'company' ? 'aura_tech' : 'demo_student');
    setAuthPassword('demo12345');
    setAuthStatus({ text: `Demo credentials loaded for ${roleType}. Click "Sign In" below or press Enter.`, type: 'success' });
  };

  // CIN Workflow Handlers
  const handleCinInputChange = (val) => {
    const uppercaseVal = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCinInput(uppercaseVal);
    if (uppercaseVal.length >= 8) {
      setCinValidation(validateCINClient(uppercaseVal));
    } else {
      setCinValidation(null);
    }
  };

  const handleCinLookup = async (targetCin) => {
    const cin = (targetCin || cinInput).trim().toUpperCase();
    const val = validateCINClient(cin);
    setCinValidation(val);
    if (!val.valid) {
      setCinLookupAlert({ text: val.message, type: 'error' });
      return;
    }

    setCinLookupLoading(true);
    setCinLookupAlert({ text: 'Connecting to MCA authorized provider & registry...', type: 'info' });

    try {
      const data = await requestJson('/api/companies/lookup/', {
        method: 'POST',
        body: JSON.stringify({ cin }),
      });

      if (data.success) {
        setCinLookupResult(data);
        setCinLookupAlert({
          text: `✓ Verified MCA company record retrieved for ${data.legal_name || data.company_name}!`,
          type: 'success',
        });
        setCinStep(2);
      } else {
        setCinLookupResult(data);
        setCinLookupAlert({
          text: data.message || 'No company record was returned by the configured provider for this CIN. Check the CIN or verify it using an official company registry.',
          type: 'error',
        });
      }
    } catch (err) {
      const payload = err.payload || {};
      setCinLookupResult(payload);
      setCinLookupAlert({
        text: err.message || 'Live company lookup is temporarily unavailable. Please try again later or enter details manually.',
        type: 'error',
      });
    } finally {
      setCinLookupLoading(false);
    }
  };

  const handleSelectSampleCin = (sampleCin) => {
    setCinInput(sampleCin);
    const val = validateCINClient(sampleCin);
    setCinValidation(val);
    handleCinLookup(sampleCin);
  };

  const handleConfirmRetrievedDetails = () => {
    if (!cinLookupResult) return;
    setProfileData((prev) => ({
      ...prev,
      cin: cinLookupResult.cin,
      legal_name: cinLookupResult.legal_name,
      company_name: cinLookupResult.company_name || cinLookupResult.legal_name,
      company_type: cinLookupResult.company_type || prev.company_type || 'Private Limited',
      company_status: cinLookupResult.company_status || 'ACTIVE',
      incorporation_date: cinLookupResult.incorporation_date || prev.incorporation_date || '',
      industry: cinLookupResult.industry || prev.industry || 'Software',
      business_activity: cinLookupResult.business_activity || prev.business_activity || '',
      state: cinLookupResult.registered_state || prev.state || '',
      district: cinLookupResult.registered_city || cinLookupResult.district || prev.district || '',
      registered_address: cinLookupResult.registered_address || '',
      authorized_capital: cinLookupResult.authorized_capital || '',
      paid_up_capital: cinLookupResult.paid_up_capital || '',
      employee_count: cinLookupResult.employee_count ?? prev.employee_count ?? '',
      annual_turnover: cinLookupResult.annual_turnover ?? prev.annual_turnover ?? '',
      msme_status: cinLookupResult.msme_status ? 'Yes' : (prev.msme_status || 'No'),
      startup_status: cinLookupResult.startup_status ? 'Yes' : (prev.startup_status || 'No'),
      data_source: cinLookupResult.data_source || 'MCA_VERIFIED_REGISTRY',
      verification_status: cinLookupResult.verification_status || 'SOURCE_VERIFIED',
    }));
    setCinStep(3);
    setProfileStatus({
      text: '✓ Retrieved MCA company data applied to profile. Complete missing MSME & operational parameters below.',
      type: 'success',
    });
  };

  const handleManualFallback = () => {
    const cin = cinInput.trim().toUpperCase();
    const prefill = cinLookupResult?.fallback_prefill || {};
    const val = cinValidation || validateCINClient(cin);

    if (cin) {
      setProfileData((prev) => ({
        ...prev,
        cin,
        state: prefill.state || (val?.valid ? val.state : '') || prev.state || '',
        company_type: prefill.company_type || (val?.valid ? val.company_type : '') || prev.company_type || 'Private Limited',
        incorporation_date: prefill.incorporation_date || (val?.valid ? `${val.year}-01-01` : '') || prev.incorporation_date || '',
        company_status: prefill.company_status || prev.company_status || 'ACTIVE',
        data_source: 'USER_MANUAL_ENTRY',
        verification_status: 'UNVERIFIED',
      }));
    }
    setCinStep(3);
    setProfileStatus({
      text: 'Manual entry active: Please fill in your company parameters manually (labelled as unverified).',
      type: 'info',
    });
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await requestJson('/api/users/logout/', { method: 'POST' });
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      setCurrentUser(null);
      localStorage.removeItem('scheme_user');
      setProfileData({});
      setSchemes(FALLBACK_SCHEMES);
      setActiveView('dash');
      setAuthStatus({ text: 'You have been logged out successfully.', type: 'success' });
      setIsLoading(false);
    }
  };

  // Handle saving and changing profile data
  const handleProfileFieldChange = (key, value) => {
    setProfileData((prev) => ({ ...prev, [key]: value }));
  };

  const handleProfileSave = async (event) => {
    if (event) event.preventDefault();

    if (!currentUser) {
      setProfileStatus({ text: 'Please sign in to update your profile.', type: 'error' });
      return;
    }

    const role = currentUser.user_type || 'student';
    const payload = buildPayload(profileData, role);
    const endpoint = role === 'student' ? '/api/students/me/' : '/api/companies/me/';

    try {
      setIsLoading(true);
      setProfileStatus({ text: 'Saving profile and calculating eligibility...', type: 'info' });
      const savedRes = await requestJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (savedRes) {
        setProfileData(parseProfileToForm(savedRes, role));
      }

      // Re-run AI recommendations engine with new updated data
      const recData = await requestJson('/api/recommendations/generate/', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const nextSchemes = (recData.results || []).map(normalizeScheme);
      if (nextSchemes.length) {
        setSchemes(nextSchemes);
      }

      setProfileStatus({
        text: '✓ All required data verified! Automatically moving to your Eligibility Dashboard...',
        type: 'success',
      });
      setDashboardAlert({
        text: `🎉 Required profile data completed! We evaluated 500 government schemes and personalized your top eligibility rankings below.`,
        type: 'success',
      });

      // Automatically move to the Eligibility Dashboard view
      setTimeout(() => {
        setActiveView('dash');
        setTimeout(() => {
          const recTarget = document.getElementById('recommendations-section');
          if (recTarget) {
            recTarget.scrollIntoView({ behavior: 'smooth' });
          }
        }, 120);
      }, 600);

    } catch (error) {
      setProfileStatus({ text: `Could not save profile: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic profile completion score calculation
  const profileCompletion = useMemo(() => {
    const fields = userRole === 'student' ? studentFields : companyFields;
    if (!fields.length) return 50;
    let filled = 0;
    for (const f of fields) {
      const val = profileData[f.key];
      if (val !== undefined && val !== null && val !== '') {
        filled++;
      }
    }
    const score = Math.round((filled / fields.length) * 100);
    return Math.max(score, 20);
  }, [profileData, userRole]);

  // Dynamic scheme counts for UI
  const catalogCount = catalogSchemes.length || 500;
  const studentSchemeCount = useMemo(() => {
    if (catalogSchemes.length > 0) {
      const c = catalogSchemes.filter((s) => s.target === 'STUDENT').length;
      if (c > 0) return c;
    }
    return 300;
  }, [catalogSchemes]);
  const companySchemeCount = useMemo(() => {
    if (catalogSchemes.length > 0) {
      const c = catalogSchemes.filter((s) => s.target === 'COMPANY').length;
      if (c > 0) return c;
    }
    return 200;
  }, [catalogSchemes]);

  // Filter schemes in catalog
  const filteredCatalog = useMemo(() => {
    const list = catalogSchemes.length > 0 ? catalogSchemes : FALLBACK_SCHEMES;
    return list.filter((item) => {
      if (directoryFilter === 'STUDENT' && item.target !== 'STUDENT') return false;
      if (directoryFilter === 'COMPANY' && item.target !== 'COMPANY') return false;
      if (directoryFilter === 'TAMIL_NADU' && !item.state.includes('TAMIL_NADU')) return false;
      if (directoryFilter === 'CENTRAL' && item.level !== 'CENTRAL') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesType = item.type.toLowerCase().includes(q);
        const matchesDept = item.department.toLowerCase().includes(q);
        const matchesDesc = (item.description || item.summary).toLowerCase().includes(q);
        return matchesName || matchesType || matchesDept || matchesDesc;
      }

      return true;
    });
  }, [catalogSchemes, directoryFilter, searchQuery]);

  // =========================================================================
  // VIEW 1: SEPARATE DEDICATED AUTHENTICATION GATEWAY (WHEN NOT AUTHENTICATED)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-gateway-container">
          {/* Left Hero & Feature Showcase */}
          <div className="auth-showcase-panel glass-panel">
            <div>
              <div className="auth-brand-badge">
                <span>✦</span> Verified Government Portal
              </div>
              <h1>AI Scheme & Scholarship Intelligence</h1>
              <p className="auth-showcase-text">
                Access a curated directory of 500 verified Central and Tamil Nadu government schemes.
                Sign in to store your academic or enterprise profile and receive precision AI match recommendations.
              </p>

              <div className="auth-features-list">
                <div className="auth-feature-item">
                  <div className="auth-feature-icon">🏛️</div>
                  <div>
                    <div className="auth-feature-title">500 Verified Official Schemes</div>
                    <div className="auth-feature-desc">300 higher education scholarships and 200 MSME & startup growth subsidies.</div>
                  </div>
                </div>

                <div className="auth-feature-item">
                  <div className="auth-feature-icon">⚡</div>
                  <div>
                    <div className="auth-feature-title">Profile Data Store & Live Changes</div>
                    <div className="auth-feature-desc">Save your profile details once and easily modify them anytime to refresh your matches.</div>
                  </div>
                </div>

                <div className="auth-feature-item">
                  <div className="auth-feature-icon">🎯</div>
                  <div>
                    <div className="auth-feature-title">AI Cosine Similarity Matcher</div>
                    <div className="auth-feature-desc">Evaluates income, category, course, and business parameters against scheme criteria.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Demo Test Helper */}
            <div className="demo-credentials-box">
              <p>
                <strong>Quick Demo Access:</strong> Want to explore right away?
              </p>
              <button
                type="button"
                className="demo-quick-btn"
                onClick={() => handleQuickDemoLogin('student')}
              >
                ⚡ Fill Demo Student Credentials (demo_student / demo12345)
              </button>
            </div>
          </div>

          {/* Right Dedicated Auth Card */}
          <div className="auth-card-panel glass-panel">
            <h2>{authMode === 'login' ? 'Sign In to Portal' : 'Create New Account'}</h2>
            <p className="sub-text">
              {authMode === 'login'
                ? 'Sign in to access your dashboard, stored data, and tailored schemes.'
                : 'Register as a Student or Enterprise to unlock personalized eligibility.'}
            </p>

            {/* Role Selector */}
            <div className="role-toggle-group">
              <button
                type="button"
                className={`role-pill-btn ${authRole === 'student' ? 'active' : ''}`}
                onClick={() => setAuthRole('student')}
              >
                🎓 Student
              </button>
              <button
                type="button"
                className={`role-pill-btn ${authRole === 'company' ? 'active' : ''}`}
                onClick={() => setAuthRole('company')}
              >
                🏢 Company / MSME
              </button>
            </div>

            {/* Mode Selector */}
            <div className="mode-tab-group">
              <button
                type="button"
                className={`mode-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('login');
                  setAuthStatus({ text: '', type: '' });
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`mode-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('register');
                  setAuthStatus({ text: '', type: '' });
                }}
              >
                Register New User
              </button>
            </div>

            {/* Status alerts */}
            {authStatus.text && (
              <div className={`status-alert ${authStatus.type}`}>
                {authStatus.text}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="auth-form-standalone">
              <div className="form-field-wrapper">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="e.g. demo_student or your_username"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  required
                />
              </div>

              {authMode === 'register' && (
                <div className="form-field-wrapper">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-field-wrapper">
                <label>Password</label>
                <input
                  type="password"
                  placeholder={authMode === 'register' ? 'At least 8 characters' : 'Enter your password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="primary-button full-width"
                disabled={isLoading}
                style={{ marginTop: '10px' }}
              >
                {isLoading
                  ? 'Verifying...'
                  : authMode === 'login'
                  ? 'Sign In & View Schemes →'
                  : 'Create Account & Continue →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ACTUAL APPLICATION (ONLY RENDERED FOR AUTHENTICATED USERS)
  // =========================================================================
  return (
    <div className="app-shell">
      {/* Top Application Bar */}
      <header className="topbar glass-panel">
        <div className="brand-block">
          <div className="brand-mark">✦</div>
          <div>
            <p className="eyebrow">Verified Government Schemes</p>
            <h3>AI Scheme & Scholarship Recommender</h3>
          </div>
        </div>

        <nav className="nav-links">
          <button
            type="button"
            className={activeView === 'dash' ? 'nav-link active' : 'nav-link'}
            onClick={() => setActiveView('dash')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeView === 'catalog' ? 'nav-link active' : 'nav-link'}
            onClick={() => setActiveView('catalog')}
          >
            All 500 Schemes
          </button>
          <button
            type="button"
            className={activeView === 'profile' ? 'nav-link active' : 'nav-link'}
            onClick={() => setActiveView('profile')}
          >
            {currentUser.user_type === 'company' ? 'Company Profile' : 'Student Profile'}
          </button>
          <button
            type="button"
            className={activeView === 'copilot' ? 'nav-link active' : 'nav-link'}
            onClick={() => setActiveView('copilot')}
          >
            AI Copilot
          </button>
        </nav>

        {/* Authenticated User Status & Logout */}
        <div className="user-badge-group">
          <div className="user-pill">
            <span className="status-dot" />
            <span>{currentUser.username}</span>
            <span className="role-badge">
              {currentUser.user_type === 'company' ? 'Company' : 'Student'}
            </span>
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            title="Log out of your account"
          >
            Log Out ⇥
          </button>
        </div>
      </header>

      <main className="page-content">
        {/* PROFILE EDITOR VIEW (Store their data & Change) */}
        {activeView === 'profile' && (
          <section className="profile-section glass-panel profile-editor-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Stored Account Profile</p>
                <h2>
                  {currentUser.user_type === 'company' ? 'Company & MSME Profile Data' : 'Student Profile & Academic Data'}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '6px 0 0' }}>
                  Enter your details below. Once required data is entered and saved, the system automatically transitions you to your Eligibility Dashboard.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div
                  className="completion-pill"
                  style={{
                    background: isAllRequiredFilled ? 'rgba(56, 189, 248, 0.16)' : undefined,
                    color: isAllRequiredFilled ? 'var(--accent)' : undefined,
                    borderColor: isAllRequiredFilled ? 'rgba(56, 189, 248, 0.45)' : undefined,
                    fontWeight: 700,
                  }}
                >
                  {isAllRequiredFilled ? '✓ All Required Data Complete' : `Required: ${filledRequiredCount}/${requiredFields.length}`}
                </div>
                <div className="completion-pill">{profileCompletion}% overall</div>
              </div>
            </div>

            {/* All required data ready celebration banner */}
            {isAllRequiredFilled && (
              <div
                className="status-alert success"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  margin: '18px 0',
                  border: '1px solid rgba(56, 189, 248, 0.45)',
                  background: 'rgba(56, 189, 248, 0.12)',
                  borderRadius: '14px',
                  padding: '14px 18px',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#FFFFFF' }}>✨ All Required Eligibility Data Entered!</strong>
                  <div style={{ fontSize: '0.84rem', marginTop: '3px', color: 'var(--text-secondary)' }}>
                    Your parameters are complete. Click below to save and automatically view your ranked eligible schemes.
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-button small"
                  onClick={handleProfileSave}
                  disabled={isLoading}
                  style={{
                    whiteSpace: 'nowrap',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {isLoading ? 'Calculating...' : '🚀 Move to Eligibility Dashboard →'}
                </button>
              </div>
            )}

            {profileStatus.text && (
              <div className={`status-alert ${profileStatus.type}`}>
                {profileStatus.text}
              </div>
            )}

            {currentUser.user_type === 'company' ? (
              <div className="cin-workflow-container">
                {/* 4-Step Interactive Stepper */}
                <div className="cin-stepper">
                  <div
                    className={`cin-step-item ${cinStep === 1 ? 'active' : cinStep > 1 ? 'completed' : ''}`}
                    onClick={() => setCinStep(1)}
                    title="Lookup and validate 21-digit Indian CIN"
                  >
                    <span className="cin-step-num">{cinStep > 1 ? '✓' : '1'}</span>
                    <span className="cin-step-label">1. CIN Lookup & MCA Verification</span>
                  </div>
                  <div className="cin-step-divider" />
                  <div
                    className={`cin-step-item ${cinStep === 2 ? 'active' : cinStep > 2 ? 'completed' : ''}`}
                    onClick={() => { if (cinLookupResult || profileData.cin) setCinStep(2); }}
                    title="Review confirmed legal details"
                  >
                    <span className="cin-step-num">{cinStep > 2 ? '✓' : '2'}</span>
                    <span className="cin-step-label">2. Review Retrieved Details</span>
                  </div>
                  <div className="cin-step-divider" />
                  <div
                    className={`cin-step-item ${cinStep === 3 ? 'active' : cinStep > 3 ? 'completed' : ''}`}
                    onClick={() => setCinStep(3)}
                    title="Complete operational & MSME details"
                  >
                    <span className="cin-step-num">{cinStep > 3 ? '✓' : '3'}</span>
                    <span className="cin-step-label">3. Operational & MSME Profile</span>
                  </div>
                  <div className="cin-step-divider" />
                  <div
                    className={`cin-step-item ${cinStep === 4 ? 'active' : ''}`}
                    onClick={() => { setActiveView('dash'); }}
                    title="View matched AI scheme recommendations"
                  >
                    <span className="cin-step-num">4</span>
                    <span className="cin-step-label">4. AI Scheme Matches</span>
                  </div>
                </div>

                {/* STEP 1: CIN Lookup & Validation */}
                {cinStep === 1 && (
                  <div className="cin-lookup-card glass-panel" style={{ borderRadius: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <span className="eyebrow" style={{ color: 'var(--accent)' }}>Step 1 of 4 • Authorized MCA Integration</span>
                        <h3 style={{ margin: '6px 0', fontSize: '1.4rem', color: '#FFFFFF' }}>Enter Corporate Identification Number (CIN)</h3>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#94A3B8' }}>
                          The system validates the 21-character structure, identifies the RoC jurisdiction & company classification, and retrieves live verified company records.
                        </p>
                      </div>
                      {profileData.cin && (
                        <div className="source-badge">
                          ✓ Stored CIN: {profileData.cin}
                        </div>
                      )}
                    </div>

                    <div className="cin-input-row">
                      <input
                        type="text"
                        className="cin-input-main"
                        placeholder="e.g. U72900TN2020PTC135001"
                        maxLength={21}
                        value={cinInput}
                        onChange={(e) => handleCinInputChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCinLookup(); }}
                      />
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          const res = validateCINClient(cinInput);
                          setCinValidation(res);
                          if (res.valid) {
                            setCinLookupAlert({ text: `✓ Valid Indian CIN syntax: ${res.listing} company in state [${res.stateCode}], incorporated ${res.year}.`, type: 'success' });
                          } else {
                            setCinLookupAlert({ text: res.message, type: 'error' });
                          }
                        }}
                      >
                        Validate Format
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={cinLookupLoading || cinInput.trim().length !== 21}
                        onClick={() => handleCinLookup()}
                        style={{ minWidth: '180px' }}
                      >
                        {cinLookupLoading ? 'Retrieving Records...' : 'Fetch Company Details ⚡'}
                      </button>
                    </div>

                    {/* Quick Test CIN Pills */}
                    <div className="cin-quick-samples">
                      <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Quick Test Indian Enterprises:</span>
                      {CIN_SAMPLE_LIST.map((sample) => (
                        <button
                          key={sample.cin}
                          type="button"
                          className="cin-sample-btn"
                          onClick={() => handleSelectSampleCin(sample.cin)}
                          title={`${sample.cin} (${sample.state})`}
                        >
                          🏢 {sample.name}
                        </button>
                      ))}
                    </div>

                    {/* Real-time Structural Breakdown Chips */}
                    {cinValidation?.valid && (
                      <div className="cin-breakdown-card">
                        <div className="cin-breakdown-cell">
                          <span className="label">Listing Status</span>
                          <span className="val" style={{ color: '#38BDF8' }}>{cinValidation.listing}</span>
                        </div>
                        <div className="cin-breakdown-cell">
                          <span className="label">Industry Code (NIC)</span>
                          <span className="val">{cinValidation.nic}</span>
                        </div>
                        <div className="cin-breakdown-cell">
                          <span className="label">State Code</span>
                          <span className="val" style={{ color: '#34D399' }}>{cinValidation.stateCode}</span>
                        </div>
                        <div className="cin-breakdown-cell">
                          <span className="label">Incorporation Year</span>
                          <span className="val">{cinValidation.year}</span>
                        </div>
                        <div className="cin-breakdown-cell">
                          <span className="label">Type Code</span>
                          <span className="val">{cinValidation.typeCode}</span>
                        </div>
                        <div className="cin-breakdown-cell">
                          <span className="label">Registration No.</span>
                          <span className="val">{cinValidation.regNo}</span>
                        </div>
                      </div>
                    )}

                    {/* Lookup Alert Banner */}
                    {cinLookupAlert.text && (
                      <div className={`status-alert ${cinLookupAlert.type}`} style={{ marginTop: '16px', marginBottom: 0 }}>
                        {cinLookupAlert.text}
                        {cinLookupAlert.type === 'error' && (
                          <div style={{ marginTop: '8px' }}>
                            <button
                              type="button"
                              className="link-button"
                              onClick={handleManualFallback}
                              style={{ color: '#38BDF8', textDecoration: 'underline', padding: 0 }}
                            >
                              Or enter company details manually (Unverified / Self-Declared) →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: Review Retrieved Details */}
                {cinStep === 2 && (
                  <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="source-badge">✓ {cinLookupResult?.verification_status || 'SOURCE_VERIFIED'}</span>
                          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Data Source: {cinLookupResult?.data_source || 'MCA'}</span>
                        </div>
                        <h3 style={{ margin: '8px 0 4px', fontSize: '1.5rem', color: '#FFFFFF' }}>
                          {cinLookupResult?.legal_name || cinLookupResult?.company_name || profileData.company_name}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#94A3B8' }}>
                          CIN: <strong style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{cinLookupResult?.cin || cinInput}</strong>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          className="secondary-button small"
                          onClick={() => setCinStep(1)}
                        >
                          ← Search Different CIN
                        </button>
                        <button
                          type="button"
                          className="primary-button small"
                          onClick={handleConfirmRetrievedDetails}
                          style={{ background: 'var(--success-bg)', color: '#34D399', borderColor: '#34D399' }}
                        >
                          Confirm & Apply Details →
                        </button>
                      </div>
                    </div>

                    <div className="cin-preview-grid">
                      <div className="cin-preview-stat">
                        <div className="stat-label">Company Registration Status</div>
                        <div className="stat-value" style={{ color: '#34D399' }}>● {cinLookupResult?.company_status || 'ACTIVE'}</div>
                      </div>
                      <div className="cin-preview-stat">
                        <div className="stat-label">Date of Incorporation</div>
                        <div className="stat-value">{cinLookupResult?.incorporation_date || 'N/A'}</div>
                      </div>
                      <div className="cin-preview-stat">
                        <div className="stat-label">Company Type & Class</div>
                        <div className="stat-value">{cinLookupResult?.company_type || 'Private Limited'} ({cinLookupResult?.company_class || 'Private'})</div>
                      </div>
                      <div className="cin-preview-stat">
                        <div className="stat-label">Registrar of Companies (RoC)</div>
                        <div className="stat-value">{cinLookupResult?.roc_code || 'RoC HQ'}</div>
                      </div>
                      <div className="cin-preview-stat">
                        <div className="stat-label">Authorized Share Capital</div>
                        <div className="stat-value">₹ {Number(cinLookupResult?.authorized_capital || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="cin-preview-stat">
                        <div className="stat-label">Paid-Up Share Capital</div>
                        <div className="stat-value">₹ {Number(cinLookupResult?.paid_up_capital || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="cin-preview-stat" style={{ gridColumn: '1 / -1' }}>
                        <div className="stat-label">Registered Office Address</div>
                        <div className="stat-value" style={{ fontWeight: 500, fontSize: '0.9rem', color: '#E2E8F0' }}>
                          {cinLookupResult?.registered_address || `${cinLookupResult?.registered_city || ''}, ${cinLookupResult?.registered_state || ''}`}
                        </div>
                      </div>
                    </div>

                    <div className="section-actions" style={{ marginTop: '20px' }}>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={handleManualFallback}
                      >
                        Edit Details Manually
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleConfirmRetrievedDetails}
                      >
                        Confirm & Proceed to Operational Profile →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Complete Operational Profile Form (MSME, DPIIT, Turnover, Employees) */}
                {cinStep === 3 && (
                  <form className="profile-grid-form" onSubmit={handleProfileSave}>
                    <div style={{ gridColumn: '1 / -1', padding: '12px 16px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      <strong style={{ fontSize: '0.92rem', color: '#38BDF8' }}>📋 Scheme Eligibility Parameters</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#94A3B8' }}>
                        MCA retrieval provides foundational registration details. Government schemes also require business operation parameters (MSME status, annual turnover, employee thresholds). Complete them below for accurate scheme ranking.
                      </p>
                    </div>

                    {activeProfileFields.map((field) => (
                      <div className="form-field-wrapper" key={field.key}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            {field.label} {field.required && <span style={{ color: '#ff6b6b' }} title="Required for eligibility">*</span>}
                          </span>
                          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {field.category === 'verified' ? (
                              <span className="field-tag-verified">✓ MCA Verified</span>
                            ) : (
                              <span className="field-tag-declared">📝 Self-Declared</span>
                            )}
                            {profileData[field.key] && (
                              <span style={{ color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 700 }}>✓ filled</span>
                            )}
                          </span>
                        </label>
                        {field.type === 'select' ? (
                          <select
                            value={profileData[field.key] ?? ''}
                            onChange={(e) => handleProfileFieldChange(field.key, e.target.value)}
                            required={field.required}
                          >
                            <option value="">Select an option</option>
                            {field.options.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            step={field.step}
                            placeholder={field.placeholder || field.label + (field.required ? ' (Required)' : '')}
                            value={profileData[field.key] ?? ''}
                            onChange={(e) => handleProfileFieldChange(field.key, e.target.value)}
                            required={field.required}
                          />
                        )}
                      </div>
                    ))}

                    <div className="section-actions" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setCinStep(1)}
                      >
                        ← Back to CIN Lookup
                      </button>
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={isLoading}
                        style={{
                          background: isAllRequiredFilled ? 'var(--primary-gradient)' : undefined,
                          color: isAllRequiredFilled ? '#070B14' : undefined,
                          boxShadow: isAllRequiredFilled ? '0 4px 18px rgba(56, 189, 248, 0.35)' : undefined,
                        }}
                      >
                        {isLoading
                          ? 'Calculating Eligibility...'
                          : isAllRequiredFilled
                          ? '🚀 Save Profile & View Eligible Schemes →'
                          : '💾 Save Profile Data & Check Matches'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form className="profile-grid-form" onSubmit={handleProfileSave}>
                {activeProfileFields.map((field) => (
                  <div className="form-field-wrapper" key={field.key}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        {field.label} {field.required && <span style={{ color: '#ff6b6b' }} title="Required for eligibility">*</span>}
                      </span>
                      {profileData[field.key] && (
                        <span style={{ color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 700 }}>✓ filled</span>
                      )}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={profileData[field.key] ?? ''}
                        onChange={(e) => handleProfileFieldChange(field.key, e.target.value)}
                        required={field.required}
                      >
                        <option value="">Select an option</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        step={field.step}
                        placeholder={field.label + (field.required ? ' (Required)' : '')}
                        value={profileData[field.key] ?? ''}
                        onChange={(e) => handleProfileFieldChange(field.key, e.target.value)}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}

                <div className="section-actions" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setActiveView('dash')}
                  >
                    Back to Dashboard
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isLoading}
                    style={{
                      background: isAllRequiredFilled ? 'var(--primary-gradient)' : undefined,
                      color: isAllRequiredFilled ? '#070B14' : undefined,
                      boxShadow: isAllRequiredFilled ? '0 4px 18px rgba(56, 189, 248, 0.35)' : undefined,
                    }}
                  >
                    {isLoading
                      ? 'Calculating Eligibility...'
                      : isAllRequiredFilled
                      ? '🚀 Save & Move to Eligibility Dashboard →'
                      : '💾 Save Profile Data & Check Matches'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* DASHBOARD VIEW */}
        {activeView === 'dash' && (
          <>
            {dashboardAlert.text && (
              <div
                className={`status-alert ${dashboardAlert.type}`}
                style={{
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: '14px',
                  boxShadow: '0 4px 20px rgba(56, 189, 248, 0.25)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.25rem' }}>🎯</span>
                  <span style={{ fontWeight: 600 }}>{dashboardAlert.text}</span>
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
                  onClick={() => setDashboardAlert({ text: '', type: '' })}
                >
                  ×
                </button>
              </div>
            )}

            {/* Enterprise CIN Verification Prompt Banner */}
            {currentUser.user_type === 'company' && (!profileData.cin || profileData.verification_status !== 'SOURCE_VERIFIED') && (
              <div
                className="status-alert"
                style={{
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(99, 102, 241, 0.14))',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '16px',
                  padding: '16px 22px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🏢</span>
                    <strong style={{ color: '#FFFFFF', fontSize: '0.96rem' }}>Verify & Autofill Your Company from Ministry of Corporate Affairs (MCA)</strong>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#94A3B8' }}>
                    Enter your 21-character CIN to retrieve official registration details, capital structure, and RoC status for 100% accurate scheme recommendations.
                  </p>
                </div>
                <button
                  type="button"
                  className="primary-button small"
                  onClick={() => {
                    setActiveView('profile');
                    setCinStep(1);
                  }}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Lookup CIN & Verify ⚡
                </button>
              </div>
            )}

            {/* Hero Banner */}
            <section className="hero-section">
              <div className="hero-copy">
                <p className="eyebrow hero-tag">
                  Welcome back, {currentUser.username} • {currentUser.user_type === 'company' ? 'Enterprise Mode' : 'Student Mode'}
                </p>
                <h1>Discover 500 verified government scholarships and enterprise schemes.</h1>
                <p className="hero-text">
                  Intelligent eligibility filtering and cosine-similarity ranking for students, researchers, MSMEs, and startups across Central and Tamil Nadu government departments.
                </p>
                <div className="hero-actions">
                  <button className="primary-button" onClick={() => setActiveView('catalog')}>
                    Browse All 500 Schemes
                  </button>
                  <button className="secondary-button" onClick={() => setActiveView('profile')}>
                    ⚙ Update My Profile
                  </button>
                </div>
                <div className="hero-stats">
                  <div>
                    <strong>{catalogCount}</strong>
                    <span>Verified Schemes</span>
                  </div>
                  <div>
                    <strong>{schemes.length}</strong>
                    <span>Matched For You</span>
                  </div>
                  <div>
                    <strong>{profileCompletion}%</strong>
                    <span>Profile Complete</span>
                  </div>
                </div>
              </div>

              <div className="hero-visual glass-panel">
                <div className="visual-header">
                  <span className="status-dot" />
                  <span>Scheme Intelligence Matrix</span>
                </div>
                <div className="visual-grid">
                  <div className="pill student-pill">{studentSchemeCount} Student Schemes</div>
                  <div className="pill company-pill">{companySchemeCount} Company Schemes</div>
                  <div className="pill ai-pill">AI Scored</div>
                  <div className="pill portal-pill">Direct Portal Links</div>
                </div>
                <div className="mini-chart">
                  <span style={{ height: 36 }} />
                  <span style={{ height: 62 }} />
                  <span style={{ height: 48 }} />
                  <span style={{ height: 76 }} />
                  <span style={{ height: 100 }} />
                </div>
              </div>
            </section>

            {/* Overview Stats */}
            <section className="dashboard-overview">
              <div className="overview-card glass-panel">
                <p className="eyebrow">Profile Completion</p>
                <h3>{profileCompletion}%</h3>
                <span>
                  <button
                    type="button"
                    className="link-button"
                    style={{ textDecoration: 'underline', color: 'var(--accent)', padding: 0 }}
                    onClick={() => setActiveView('profile')}
                  >
                    Edit profile data →
                  </button>
                </span>
              </div>
              <div className="overview-card glass-panel">
                <p className="eyebrow">Personalized Matches</p>
                <h3>{schemes.length}</h3>
                <span>Matched to your stored data</span>
              </div>
              <div className="overview-card glass-panel">
                <p className="eyebrow">Total Database</p>
                <h3>{catalogCount}</h3>
                <span>{studentSchemeCount} Student + {companySchemeCount} Enterprise</span>
              </div>
              <div className="overview-card glass-panel">
                <p className="eyebrow">Account Mode</p>
                <h3>{currentUser.user_type === 'company' ? 'Enterprise' : 'Student'}</h3>
                <span>{currentUser.email || currentUser.username}</span>
              </div>
            </section>

            {/* Recommended Opportunities */}
            <section id="recommendations-section" className="recommendation-panel" style={{ marginTop: '32px' }}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Personalized AI Ranking</p>
                  <h2>Top Matched Opportunities ({schemes.length})</h2>
                </div>
                <button className="link-button" onClick={() => setActiveView('catalog')}>
                  View all 500 schemes →
                </button>
              </div>

              <div className="card-grid">
                {schemes.map((scheme) => (
                  <article className="scheme-card glass-panel" key={scheme.id}>
                    <div className="card-topline">
                      <span className="badge">{scheme.type}</span>
                      <span className="score">{scheme.match}% Match</span>
                    </div>

                    <h3>{scheme.name}</h3>

                    <div className="status-row" style={{ flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <span className={`eligibility-status-pill ${
                        scheme.eligibilityStatus === 'ELIGIBLE'
                          ? 'status-eligible'
                          : scheme.eligibilityStatus === 'POTENTIALLY_ELIGIBLE'
                          ? 'status-potentially'
                          : scheme.eligibilityStatus === 'NEEDS_VERIFICATION'
                          ? 'status-verification'
                          : scheme.eligibilityStatus === 'NOT_ELIGIBLE'
                          ? 'status-not-eligible'
                          : 'status-eligible'
                      }`}>
                        {scheme.eligibilityStatus === 'NOT_ELIGIBLE' ? '✕' : '✓'} {scheme.eligibilityStatusLabel || (scheme.eligible ? 'Eligible based on profile' : 'Under review')}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginLeft: 'auto' }}>
                        Relevance: <strong>{scheme.match}%</strong> (not approval guarantee)
                      </span>
                    </div>

                    {scheme.relevanceExplanation && (
                      <div className="scheme-rationale-box">
                        <strong>💡 Why it matches: </strong>
                        {scheme.relevanceExplanation}
                      </div>
                    )}

                    {scheme.unmetConditions && scheme.unmetConditions.length > 0 && (
                      <div style={{ fontSize: '0.76rem', color: '#F87171', margin: '4px 0', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                        ✕ Unmet criteria: {scheme.unmetConditions.join('; ')}
                      </div>
                    )}

                    {scheme.verificationItems && scheme.verificationItems.length > 0 && (
                      <div style={{ fontSize: '0.76rem', color: '#FBBF24', margin: '4px 0', padding: '4px 8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
                        ℹ Requires documentary proof: {scheme.verificationItems.join('; ')}
                      </div>
                    )}

                    <p className="benefit">{scheme.benefit}</p>
                    <p className="summary">{scheme.summary}</p>

                    <div className="docs-block">
                      <span>Required Documents</span>
                      <ul>
                        {scheme.docs.map((doc) => (
                          <li key={doc}>{doc}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="footer-row">
                      <span>Deadline: {scheme.deadline}</span>
                      <span>{scheme.verified ? '✓ Verified Source' : 'Pending review'}</span>
                    </div>

                    <div className="card-actions">
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() => setSelectedScheme(scheme)}
                      >
                        View Details
                      </button>
                      <a
                        href={scheme.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="primary-button small"
                        style={{ textAlign: 'center', textDecoration: 'none' }}
                      >
                        Official Portal ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* CATALOG VIEW (All 500 Schemes) */}
        {activeView === 'catalog' && (
          <section className="recommendation-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Verified Public Scheme Repository</p>
                <h2>All 500 Government Schemes ({filteredCatalog.length})</h2>
              </div>
            </div>

            <div className="directory-controls">
              <input
                type="text"
                className="search-bar"
                placeholder="Search schemes by keyword, department, or benefit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="filter-pills">
                <button
                  type="button"
                  className={`filter-pill ${directoryFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setDirectoryFilter('ALL')}
                >
                  All ({catalogCount})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${directoryFilter === 'STUDENT' ? 'active' : ''}`}
                  onClick={() => setDirectoryFilter('STUDENT')}
                >
                  Students ({studentSchemeCount})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${directoryFilter === 'COMPANY' ? 'active' : ''}`}
                  onClick={() => setDirectoryFilter('COMPANY')}
                >
                  MSME & Startups ({companySchemeCount})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${directoryFilter === 'TAMIL_NADU' ? 'active' : ''}`}
                  onClick={() => setDirectoryFilter('TAMIL_NADU')}
                >
                  Tamil Nadu
                </button>
                <button
                  type="button"
                  className={`filter-pill ${directoryFilter === 'CENTRAL' ? 'active' : ''}`}
                  onClick={() => setDirectoryFilter('CENTRAL')}
                >
                  Central Govt
                </button>
              </div>
            </div>

            <div className="card-grid">
              {filteredCatalog.map((scheme) => (
                <article className="scheme-card glass-panel" key={scheme.id}>
                  <div className="card-topline">
                    <span className="badge">{scheme.type}</span>
                    <span className="score">ID #{scheme.id}</span>
                  </div>

                  <h3>{scheme.name}</h3>
                  <div className="status-row">
                    <span className="status-indicator">✓</span>
                    <span>{scheme.department}</span>
                  </div>

                  <p className="benefit">{scheme.benefit}</p>
                  <p className="summary">{scheme.summary}</p>

                  <div className="footer-row">
                    <span>Scope: {scheme.state} ({scheme.level})</span>
                    <span>Target: {scheme.target}</span>
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() => setSelectedScheme(scheme)}
                    >
                      View Details
                    </button>
                    <a
                      href={scheme.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="primary-button small"
                      style={{ textAlign: 'center', textDecoration: 'none' }}
                    >
                      Official Portal ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* COPILOT / ASSISTANT VIEW — Dynamic Real-Time Chat Workspace */}
        {activeView === 'copilot' && (
          <section className="copilot-workspace">
            {/* Left Intelligence Sidebar */}
            <aside className="copilot-sidebar-panel glass-panel">
              {/* AI Status Badge */}
              <div className="copilot-ai-badge">
                <div className="copilot-ai-avatar">✦</div>
                <div className="copilot-ai-meta">
                  <div className="copilot-ai-title">
                    <span className="copilot-status-dot" /> AI Copilot
                  </div>
                  <div className="copilot-ai-subtitle">Live Scheme Intelligence</div>
                </div>
              </div>

              {/* Quick Topic Prompts */}
              <div>
                <div className="copilot-sidebar-section-title">Quick Topics</div>
                <div className="copilot-topic-list">
                  <button
                    type="button"
                    className="copilot-topic-btn"
                    disabled={chatLoading}
                    onClick={() => handleSendChatMessage('What scholarships are available for college students?')}
                  >
                    <span className="copilot-topic-icon">🎓</span>
                    <span>Top Scholarships</span>
                  </button>
                  <button
                    type="button"
                    className="copilot-topic-btn"
                    disabled={chatLoading}
                    onClick={() => handleSendChatMessage('What Central MSME subsidies and seed funds can I get?')}
                  >
                    <span className="copilot-topic-icon">🏢</span>
                    <span>MSME & Startup Funds</span>
                  </button>
                  <button
                    type="button"
                    className="copilot-topic-btn"
                    disabled={chatLoading}
                    onClick={() => handleSendChatMessage('Show schemes for girl students and women in Tamil Nadu')}
                  >
                    <span className="copilot-topic-icon">👩</span>
                    <span>Women & Girl Schemes</span>
                  </button>
                  <button
                    type="button"
                    className="copilot-topic-btn"
                    disabled={chatLoading}
                    onClick={() => handleSendChatMessage('Am I eligible for any schemes based on my profile?')}
                  >
                    <span className="copilot-topic-icon">🎯</span>
                    <span>Check My Eligibility</span>
                  </button>
                  <button
                    type="button"
                    className="copilot-topic-btn"
                    disabled={chatLoading}
                    onClick={() => handleSendChatMessage('What documents do I need to apply for scholarships?')}
                  >
                    <span className="copilot-topic-icon">📋</span>
                    <span>Document Checklist</span>
                  </button>
                  <button
                    type="button"
                    className="copilot-topic-btn"
                    disabled={chatLoading}
                    onClick={() => handleSendChatMessage('How do I apply for government schemes step by step?')}
                  >
                    <span className="copilot-topic-icon">🚀</span>
                    <span>How to Apply</span>
                  </button>
                </div>
              </div>

              {/* Active Profile Intelligence Snapshot */}
              <div className="copilot-profile-snapshot">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="copilot-sidebar-section-title" style={{ margin: 0 }}>Active Profile</div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.74rem', cursor: 'pointer', padding: 0 }}
                    onClick={() => setActiveView('profile')}
                  >
                    Edit ⚙
                  </button>
                </div>
                <div className="copilot-snapshot-grid">
                  <div className="copilot-snapshot-item">
                    <div className="copilot-snapshot-label">Role</div>
                    <div className="copilot-snapshot-val">{currentUser.user_type === 'company' ? 'Enterprise' : 'Student'}</div>
                  </div>
                  <div className="copilot-snapshot-item">
                    <div className="copilot-snapshot-label">State</div>
                    <div className="copilot-snapshot-val">{profileData.state || 'Tamil Nadu'}</div>
                  </div>
                  <div className="copilot-snapshot-item">
                    <div className="copilot-snapshot-label">{currentUser.user_type === 'company' ? 'Industry' : 'Category'}</div>
                    <div className="copilot-snapshot-val">
                      {currentUser.user_type === 'company' ? (profileData.industry || 'General') : (profileData.category || 'General')}
                    </div>
                  </div>
                  <div className="copilot-snapshot-item">
                    <div className="copilot-snapshot-label">{currentUser.user_type === 'company' ? 'MSME' : 'CGPA / Marks'}</div>
                    <div className="copilot-snapshot-val">
                      {currentUser.user_type === 'company' ? (profileData.msme_status || 'Pending') : (profileData.marks_or_cgpa ? `${profileData.marks_or_cgpa}%` : 'Not set')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                <button
                  type="button"
                  className="secondary-button small"
                  style={{ fontSize: '0.8rem', width: '100%' }}
                  onClick={async () => {
                    try {
                      await requestJson('/api/ai-copilot/clear/', { method: 'DELETE' });
                    } catch (e) {
                      console.warn('Clear error:', e);
                    }
                    setChatMessages([{
                      id: 'welcome-' + Date.now(),
                      role: 'assistant',
                      content: `### 🗑️ Chat History Cleared\nHello **${currentUser.username}**! I have refreshed our session. All 500 Central and Tamil Nadu government schemes are ready to query. What would you like to explore today?`,
                      createdAt: new Date().toISOString(),
                    }]);
                    setCopilotMatchedSchemes([]);
                    setChatSuggestions([
                      'What scholarships are available for students in Tamil Nadu?',
                      'Tell me about MSME subsidies and startup seed funds',
                      'What documents do I need to apply for schemes?',
                    ]);
                  }}
                >
                  🗑 Clear Chat History
                </button>
              </div>
            </aside>

            {/* Right Main Chat Stage */}
            <div className="copilot-chat-stage">
              {/* Header Bar */}
              <div className="copilot-header-bar glass-panel">
                <div className="copilot-header-info">
                  <div className="brand-mark" style={{ width: '34px', height: '34px' }}>✦</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-heading)' }}>
                      AI Scheme Copilot — Real-Time Guidance
                    </h3>
                    <p className="eyebrow" style={{ margin: 0 }}>
                      500 Verified Government Records &bull; Personalized via Stored Profile
                    </p>
                  </div>
                </div>

                <div className="copilot-header-actions">
                  <button
                    type="button"
                    className="secondary-button small"
                    onClick={() => setActiveView('dash')}
                    style={{ fontSize: '0.8rem' }}
                  >
                    ← Dashboard
                  </button>
                </div>
              </div>

              {/* Messages Stream Container */}
              <div className="copilot-messages-container glass-panel">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`copilot-msg-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}
                  >
                    <div className="copilot-msg-avatar">
                      {msg.role === 'user' ? '👤' : '✦'}
                    </div>

                    <div className="copilot-msg-body">
                      <div className={`copilot-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                        {msg.role === 'user' ? (
                          msg.content
                        ) : (
                          <>
                            {renderCopilotMarkdown(msg.content)}

                            {/* Inline Matched Schemes attached to this assistant message */}
                            {msg.matchedSchemes && msg.matchedSchemes.length > 0 && (
                              <div className="copilot-inline-schemes">
                                <div style={{ fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
                                  📌 Matched Schemes ({msg.matchedSchemes.length}):
                                </div>
                                {msg.matchedSchemes.map((s) => (
                                  <div key={s.id} className="copilot-inline-card">
                                    <div className="copilot-card-top">
                                      <span className="copilot-card-title">{s.name}</span>
                                      <div className="copilot-card-tags">
                                        <span className={`copilot-tag-pill ${s.level === 'CENTRAL' ? 'central' : 'state'}`}>
                                          {s.level === 'CENTRAL' ? 'Central' : s.state}
                                        </span>
                                        <span className="copilot-tag-pill">
                                          {s.target}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="copilot-card-benefit">
                                      <span>💰</span> {s.benefit}
                                    </div>
                                    <div className="copilot-card-actions">
                                      <button
                                        type="button"
                                        className="secondary-button small"
                                        style={{ fontSize: '0.74rem', padding: '0.35rem 0.7rem' }}
                                        onClick={() => setSelectedScheme({
                                          ...s,
                                          benefit: s.benefit,
                                          summary: s.summary,
                                          docs: ['Aadhaar Card', 'Income Certificate', 'Academic Proof'],
                                          deadline: 'Active',
                                          verified: true,
                                        })}
                                      >
                                        View Details
                                      </button>
                                      <a
                                        href={s.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="primary-button small"
                                        style={{ fontSize: '0.74rem', padding: '0.35rem 0.7rem', textDecoration: 'none' }}
                                      >
                                        Official Portal ↗
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Message Toolbar */}
                      {msg.role === 'assistant' && (
                        <div className="copilot-msg-toolbar">
                          <button
                            type="button"
                            className="copilot-tool-btn"
                            title="Copy response to clipboard"
                            onClick={() => copyMessageContent(msg.id, msg.content)}
                          >
                            <span>{copiedMsgId === msg.id ? '✓' : '📋'}</span>
                            <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            type="button"
                            className={`copilot-tool-btn ${speakingMsgId === msg.id ? 'speaking' : ''}`}
                            title={speakingMsgId === msg.id ? 'Stop audio' : 'Read aloud response'}
                            onClick={() => speakMessage(msg.id, msg.content)}
                          >
                            <span>{speakingMsgId === msg.id ? '⏹' : '🔊'}</span>
                            <span>{speakingMsgId === msg.id ? 'Stop' : 'Read'}</span>
                          </button>
                          <span className="copilot-msg-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Shimmering Typing Indicator */}
                {chatLoading && (
                  <div className="copilot-typing-row">
                    <div className="copilot-msg-avatar" style={{ background: 'var(--primary-gradient)', color: '#070B14', fontWeight: 800 }}>
                      ✦
                    </div>
                    <div className="copilot-typing-bubble">
                      <span className="copilot-typing-dot" />
                      <span className="copilot-typing-dot" />
                      <span className="copilot-typing-dot" />
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: '6px' }}>Searching 500 schemes...</span>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Dynamic Follow-up Suggestions */}
              {chatSuggestions.length > 0 && (
                <div className="copilot-suggestions-panel">
                  <div className="copilot-suggestions-header">💡 Suggested Follow-ups:</div>
                  <div className="copilot-suggestions-row">
                    {chatSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="copilot-action-chip"
                        disabled={chatLoading}
                        onClick={() => handleSendChatMessage(s)}
                      >
                        <span>✦</span> {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Input Composer Card */}
              <div className="copilot-composer-card glass-panel">
                <div className="copilot-input-row">
                  <textarea
                    className="copilot-textarea"
                    placeholder={`Ask anything about scholarships, MSME subsidies, documents, or eligibility... (${currentUser.user_type === 'company' ? 'Enterprise' : 'Student'} mode)`}
                    value={chatInput}
                    disabled={chatLoading}
                    rows={1}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                  />

                  <div className="copilot-composer-actions">
                    <button
                      type="button"
                      className={`copilot-voice-button ${isListening ? 'recording' : ''}`}
                      title={isListening ? 'Stop recording' : 'Voice input (Speech to Text)'}
                      onClick={toggleVoiceInput}
                    >
                      {isListening ? '⏹' : '🎙️'}
                    </button>

                    <button
                      type="button"
                      className="copilot-send-button"
                      disabled={chatLoading || !chatInput.trim()}
                      onClick={() => handleSendChatMessage()}
                    >
                      {chatLoading ? 'Thinking...' : 'Ask ➤'}
                    </button>
                  </div>
                </div>

                <div className="copilot-composer-footer">
                  <span>
                    Press <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.72rem' }}>Enter</kbd> to send &bull; <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.72rem' }}>Shift+Enter</kbd> for new line
                  </span>
                  <span>🎙️ Voice Input &bull; 🔊 Read Aloud Active</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Selected Scheme Modal Dialog */}
        {selectedScheme && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(7, 11, 20, 0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={() => setSelectedScheme(null)}
          >
            <div
              className="glass-panel"
              style={{
                maxWidth: '680px',
                width: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                padding: '32px',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span className="badge" style={{ marginBottom: '8px' }}>{selectedScheme.type}</span>
                  <h2 style={{ margin: '8px 0', fontSize: '1.4rem' }}>{selectedScheme.name}</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{selectedScheme.department} • {selectedScheme.level} Level</p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setSelectedScheme(null)}
                  style={{ fontSize: '1.4rem', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Benefits</h4>
                <p style={{ lineHeight: '1.6', color: 'var(--text)' }}>{selectedScheme.benefit}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Eligibility Summary</h4>
                <p style={{ lineHeight: '1.6', color: 'var(--text)' }}>{selectedScheme.summary}</p>
              </div>

              {selectedScheme.description && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Description</h4>
                  <p style={{ lineHeight: '1.6', color: 'var(--muted)' }}>{selectedScheme.description}</p>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'var(--accent)', marginBottom: '6px' }}>Target Audience & Geographic Coverage</h4>
                <p style={{ color: 'var(--text)' }}>Target: <strong>{selectedScheme.target}</strong> | Region: <strong>{selectedScheme.state}</strong></p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-button" onClick={() => setSelectedScheme(null)}>Close</button>
                <a
                  href={selectedScheme.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-button"
                  style={{ textDecoration: 'none' }}
                >
                  Open Official Application Portal ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Persistent Floating AI Copilot Trigger Button (Visible anywhere) */}
        {activeView !== 'copilot' && (
          <button
            type="button"
            className="copilot-floating-launcher"
            onClick={() => setIsCopilotDrawerOpen(true)}
            title="Ask AI Copilot about any scheme"
          >
            <div className="copilot-floating-orb">✦</div>
            <span>AI Copilot</span>
          </button>
        )}

        {/* Floating AI Copilot Flyout Drawer Modal */}
        {isCopilotDrawerOpen && (
          <div
            className="copilot-drawer-overlay"
            onClick={() => setIsCopilotDrawerOpen(false)}
          >
            <div
              className="copilot-drawer-modal"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="copilot-drawer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="copilot-ai-avatar" style={{ width: '32px', height: '32px', fontSize: '1rem' }}>✦</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="copilot-status-dot" /> AI Copilot
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>500 Schemes Connected</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="copilot-toggle-btn"
                    style={{ fontSize: '0.74rem' }}
                    onClick={() => {
                      setIsCopilotDrawerOpen(false);
                      setActiveView('copilot');
                    }}
                  >
                    Expand Full ↗
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    style={{ fontSize: '1.2rem', cursor: 'pointer' }}
                    onClick={() => setIsCopilotDrawerOpen(false)}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Drawer Messages Stream */}
              <div className="copilot-drawer-body">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`copilot-msg-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}`}
                  >
                    <div className="copilot-msg-avatar" style={{ width: '30px', height: '30px', fontSize: '0.9rem' }}>
                      {msg.role === 'user' ? '👤' : '✦'}
                    </div>

                    <div className="copilot-msg-body" style={{ maxWidth: '86%' }}>
                      <div className={`copilot-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`} style={{ padding: '12px 16px', fontSize: '0.88rem' }}>
                        {msg.role === 'user' ? msg.content : renderCopilotMarkdown(msg.content)}
                      </div>

                      {msg.role === 'assistant' && (
                        <div className="copilot-msg-toolbar">
                          <button
                            type="button"
                            className="copilot-tool-btn"
                            onClick={() => copyMessageContent(msg.id, msg.content)}
                          >
                            <span>{copiedMsgId === msg.id ? '✓' : '📋'}</span>
                          </button>
                          <button
                            type="button"
                            className={`copilot-tool-btn ${speakingMsgId === msg.id ? 'speaking' : ''}`}
                            onClick={() => speakMessage(msg.id, msg.content)}
                          >
                            <span>{speakingMsgId === msg.id ? '⏹' : '🔊'}</span>
                          </button>
                          <span className="copilot-msg-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="copilot-typing-row">
                    <div className="copilot-msg-avatar" style={{ width: '30px', height: '30px', fontSize: '0.9rem', background: 'var(--primary-gradient)', color: '#070B14', fontWeight: 800 }}>✦</div>
                    <div className="copilot-typing-bubble" style={{ padding: '8px 14px' }}>
                      <span className="copilot-typing-dot" />
                      <span className="copilot-typing-dot" />
                      <span className="copilot-typing-dot" />
                    </div>
                  </div>
                )}

                <div ref={drawerChatEndRef} />
              </div>

              {/* Drawer Suggestions & Composer */}
              <div className="copilot-drawer-footer">
                {chatSuggestions.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px' }}>
                    {chatSuggestions.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="copilot-action-chip"
                        style={{ fontSize: '0.74rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
                        disabled={chatLoading}
                        onClick={() => handleSendChatMessage(s)}
                      >
                        ✦ {s}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <textarea
                    className="copilot-textarea"
                    style={{ minHeight: '38px', maxHeight: '90px', fontSize: '0.88rem', padding: '6px 10px', background: 'var(--surface-input)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.25)', color: 'var(--text)' }}
                    placeholder="Ask AI Copilot..."
                    value={chatInput}
                    disabled={chatLoading}
                    rows={1}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={`copilot-voice-button ${isListening ? 'recording' : ''}`}
                    style={{ width: '36px', height: '36px' }}
                    onClick={toggleVoiceInput}
                    title="Voice input"
                  >
                    {isListening ? '⏹' : '🎙️'}
                  </button>
                  <button
                    type="button"
                    className="copilot-send-button"
                    style={{ height: '36px', padding: '0 14px', fontSize: '0.82rem' }}
                    disabled={chatLoading || !chatInput.trim()}
                    onClick={() => handleSendChatMessage()}
                  >
                    Ask ➤
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
