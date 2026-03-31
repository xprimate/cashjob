import { useEffect, useState } from 'react';
import { listJobs, deleteJob, updateJob } from '../services/api';
import { jobCategories } from '../constants/categories';
import { locationsByProvince, provinces } from '../constants/locations';

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [category, setCategory] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadJobs = async () => {
    try {
      setLoading(true);
      const params = {
        category: category || undefined,
        province: province || undefined,
        city: city || undefined,
        mine: mineOnly ? 'true' : undefined,
      };
      const resp = await listJobs(params);
      const sorted = (resp.data || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setJobs(sorted);
      setError('');
    } catch (err) {
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('cashjob_user') || 'null');
    setUser(savedUser);
    loadJobs();
  }, []);

  useEffect(() => {
    loadJobs();
  }, [category, province, city, mineOnly]);

  const toggleDetails = (jobId) => {
    setSelectedJobId((prev) => (prev === jobId ? null : jobId));
  };

  const startEdit = (job) => {
    setEditingJobId(job.id);
    setEditTitle(job.title);
    setEditDescription(job.description);
    setError('');
  };

  const cancelEdit = () => {
    setEditingJobId(null);
    setEditTitle('');
    setEditDescription('');
    setError('');
  };

  const handleSaveEdit = async (jobId) => {
    try {
      setLoading(true);
      await updateJob(jobId, { title: editTitle, description: editDescription });
      setEditingJobId(null);
      loadJobs();
    } catch (err) {
      setError('Failed to update job');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job?')) return;
    try {
      setLoading(true);
      await deleteJob(jobId);
      setSelectedJobId(null);
      loadJobs();
    } catch (err) {
      setError('Failed to delete job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <h2>Job Listings</h2>
        <div className="filters">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All</option>
              {jobCategories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Province
            <select value={province} onChange={(e) => {
              const selectedProvince = e.target.value;
              setProvince(selectedProvince);
              setCity(selectedProvince ? locationsByProvince[selectedProvince][0] : '');
            }}>
              <option value="">All</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            City
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All</option>
              {province && locationsByProvince[province].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          {user && (
            <label>
              My postings only
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            </label>
          )}
        </div>

        {loading ? (<p>Loading ...</p>) : null}
        {error ? (<p className="error">{error}</p>) : null}

        <div className="job-list">
          {jobs.length === 0 && <p>No jobs found.</p>}
          {jobs.map((job) => (
            <div key={job.id} className="job-card" style={{ cursor: 'pointer' }} onClick={() => toggleDetails(job.id)}>
              <h3>
                {job.title || 'Untitled job'}{' '}
                {user && job.posterId === user.id && (
                  <span style={{ fontSize: '0.8rem', color: '#008' }}>(Your posting)</span>
                )}
              </h3>
              <span><strong>Category:</strong> {job.category} |</span>
              <span><strong>Location:</strong> {job.province}, {job.city} |</span>
              <span><strong>User:</strong></span>{' '}
              <p><strong>Description:</strong> {job.description?.slice(0, 120)}{job.description?.length > 120 ? '...' : ''}</p>
              <p>
                {job.isAnonymous
                  ? `${job.posterName || 'Anonymous'}`
                  : `${job.posterName ? job.posterName : `User #${job.posterId}`}`}
              </p>
              {job.contactEmail && <p><strong>Contact:</strong> {job.contactEmail}</p>}
              {job.contactPhone && <p><strong>Phone:</strong> {job.contactPhone}</p>}

              {selectedJobId === job.id && (
                <div style={{ marginTop: '10px', background: '#f4f9ff', padding: '10px', borderRadius: '6px' }}>
                  {editingJobId === job.id ? (
                    <div>
                      <label>
                        Title
                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%' }} />
                      </label>
                      <label>
                        Description
                        <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} style={{ width: '100%' }} />
                      </label>
                      <button onClick={() => handleSaveEdit(job.id)}>Save</button>
                      <button onClick={cancelEdit}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <p>{job.description}</p>
                      <p><strong>Posted on:</strong> {new Date(job.createdAt).toLocaleString()}</p>
                      {user && job.posterId === user.id && (
                        <div style={{ marginTop: '10px' }}>
                          <button onClick={(e) => { e.stopPropagation(); startEdit(job); }}>Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }}>Delete</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
