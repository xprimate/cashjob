import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCaptcha, listJobs, postJob, sendVerification, verifyEmail } from '../services/api';
import { jobCategories } from '../constants/categories';
import { locationsByProvince, provinces } from '../constants/locations';

export default function PostJob() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(jobCategories[0]);
  const [province, setProvince] = useState('Ontario');
  const [city, setCity] = useState(locationsByProvince.Ontario[0]);
  const [captchaToken, setCaptchaToken] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [anonymousName, setAnonymousName] = useState('');
  const [loggedUser, setLoggedUser] = useState(null);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [needEmailVerify, setNeedEmailVerify] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');

  const loadCaptcha = async () => {
    try {
      const resp = await getCaptcha();
      setCaptchaToken(resp.data.token);
      setCaptchaQuestion(resp.data.question);
    } catch (err) {
      setError('Could not load captcha.');
    }
  };

  useEffect(() => {
    loadCaptcha();

    const savedUser = JSON.parse(localStorage.getItem('cashjob_user') || 'null');
    if (savedUser) {
      setLoggedUser(savedUser);

      if (!savedUser.emailValidated) {
        listJobs({ mine: 'true' })
          .then((resp) => {
            if ((resp.data || []).length >= 1) {
              setNeedEmailVerify(true);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const handleSendVerification = async () => {
    setVerificationStatus('');
    try {
      const resp = await sendVerification();
      setVerificationToken(resp.data.token);
      setVerificationStatus('Verification email sent. (Demo token is shown below so link behavior can be tested.)');
      setNeedEmailVerify(true);
    } catch (err) {
      setVerificationStatus('Unable to send verification email. Please try again.');
    }
  };

  const handleVerifyEmail = async () => {
    setVerificationStatus('');
    try {
      await verifyEmail(verificationToken);
      setVerificationStatus('Email verified successfully. You can post again.');
    } catch (err) {
      setVerificationStatus(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const payload = {
        title,
        description,
        category,
        province,
        city,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        anonymousName: loggedUser ? null : anonymousName.trim(),
        captchaToken,
        captchaAnswer,
        isAnonymous: loggedUser ? false : true,
      };

      await postJob(payload);
      setMessage('Job submitted and auto-approved. Redirecting to job list...');
      setTitle('');
      setDescription('');
      setContactEmail('');
      setContactPhone('');
      setAnonymousName('');
      setCaptchaAnswer('');
      loadCaptcha();
      setTimeout(() => navigate('/'), 250);
    } catch (err) {
      const messageText = err.response?.data?.message || 'Unable to submit job.';
      setError(messageText);
      if (err.response?.status === 403 && messageText.toLowerCase().includes('verify')) {
        setNeedEmailVerify(true);
      }
      loadCaptcha();
    }
  };

  return (
    <div className="page">
      <div className="container">
        <h2>Post a Cash Job</h2>
        <form onSubmit={handleSubmit} className="job-form">
        <div style={{ display: 'grid', gap: '12px', maxWidth: '700px' }}>
          <label>
           Job Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} style={{ width: '100%', maxWidth: '400px' }} />
          </label>
        </div>
          <label>
           Job  Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={1000} rows={18} style={{ width: '100%', minHeight: '260px', fontSize: '1rem' }} />
          </label>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '8px' }}>
          <label style={{ flex: '1 1 220px', minWidth: '180px' }}>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%' }}>
              {jobCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label style={{ flex: '1 1 220px', minWidth: '180px' }}>
            Province
            <select value={province} onChange={(e) => {
              setProvince(e.target.value);
              setCity(locationsByProvince[e.target.value][0]);
            }} style={{ width: '100%' }}>
              {provinces.map((prov) => <option key={prov} value={prov}>{prov}</option>)}
            </select>
          </label>
          <label style={{ flex: '1 1 220px', minWidth: '180px' }}>
            City
            <select value={city} onChange={(e) => setCity(e.target.value)} style={{ width: '100%' }}>
              {locationsByProvince[province].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', maxWidth: '760px', marginBottom: '12px' }}>
          {!loggedUser && (
            <label style={{ flex: '1 1 220px', minWidth: '180px' }}>
              Anonymous name (required)
              <input value={anonymousName} onChange={(e) => setAnonymousName(e.target.value)} placeholder="Alias" style={{ width: '100%' }} required />
            </label>
          )}

          <label style={{ flex: '1 1 220px', minWidth: '180px' }}>
            Contact phone (optional)
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 416-555-1234" style={{ width: '100%' }} />
          </label>

          <label style={{ flex: '1 1 220px', minWidth: '180px' }}>
            Contact email (optional)
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} style={{ width: '100%' }} />
          </label>
        </div>
        {loggedUser && (
          <p className="info">Logged in as {loggedUser.name}. Posts are linked to your account.</p>
        )}

        <div className="">
          <p>Captcha: {captchaQuestion}</p>
          <input value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} required style={{ width: '120px', padding: '4px 8px', fontSize: '0.9rem' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
          <button type="submit" style={{ width: '240px', padding: '12px 16px', fontSize: '1rem' }}>Post Job</button>
        </div>
      </form>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div style={{ marginTop: '16px' }}>
        {needEmailVerify ? (
          <>
            <p className="info">Second posting requires email verification; send a verification link to your registered email.</p>
            <button type="button" onClick={handleSendVerification}>Send verification email</button>
          </>
        ) : null}

        {verificationStatus && <p className="success">{verificationStatus}</p>}

        {verificationToken && (
          <div>
            <p>Token: {verificationToken}</p>
            <input value={verificationToken} onChange={(e) => setVerificationToken(e.target.value)} placeholder="Verification token" />
            <button type="button" onClick={handleVerifyEmail}>Verify Email</button>
          </div>
        )}
        {verificationStatus && <p className="success">{verificationStatus}</p>}
      </div>
      </div>
    </div>
  );
}
