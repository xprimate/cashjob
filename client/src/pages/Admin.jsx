import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getAdminJobs = (params) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`http://localhost:4000/api/admin/jobs?${query}`, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('cashjob_token')}` } }).then((res) => res.json());
};
const getAdminStats = () => fetch('http://localhost:4000/api/admin/stats', { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('cashjob_token')}` } }).then((res) => res.json());
const downloadCsv = () => fetch('http://localhost:4000/api/admin/jobs/csv', { headers: { Authorization: `Bearer ${localStorage.getItem('cashjob_token')}` } }).then((res) => res.blob());

const updateJobStatus = (jobId, status) => fetch(`http://localhost:4000/api/admin/jobs/${jobId}/status`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('cashjob_token')}`,
  },
  body: JSON.stringify({ status }),
}).then((res) => res.json());

const deleteJob = (jobId) => fetch(`http://localhost:4000/api/admin/jobs/${jobId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${localStorage.getItem('cashjob_token')}` },
}).then((res) => res.json());

const deleteAllJobs = () => fetch('http://localhost:4000/api/admin/jobs', {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${localStorage.getItem('cashjob_token')}` },
}).then((res) => res.json());

const getAdminUsers = () => fetch('http://localhost:4000/api/admin/users', {
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('cashjob_token')}` },
}).then((res) => res.json());

const deleteUser = (userId) => fetch(`http://localhost:4000/api/admin/users/${userId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${localStorage.getItem('cashjob_token')}` },
}).then((res) => res.json());

export default function Admin({ user }) {
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('jobs');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchJobs = async () => {
    try {
      const params = { page: currentPage, limit: 5 };
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      if (filterStatus === 'all') params.status = 'all';
      if (filterCategory) params.category = filterCategory;
      const data = await getAdminJobs(params);
      if (data?.message) throw new Error(data.message);
      setJobs(data.jobs || []);
      setSelectedJobs([]);
      setTotalPages(data.totalPages || 1);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load admin jobs');
      setJobs([]);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getAdminStats();
      if (data?.message) throw new Error(data.message);
      setStats(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load stats');
      setStats(null);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getAdminUsers();
      if (data?.message) throw new Error(data.message);
      setUsers(data.users || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load users');
      setUsers([]);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const blob = await downloadCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'jobs.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Unable to download CSV');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Delete this job permanently?')) return;
    try {
      const data = await deleteJob(jobId);
      if (data?.message) {
        setMessage(data.message);
      }
      await fetchJobs();
      await fetchStats();
    } catch (err) {
      setError(err.message || 'Unable to delete job');
    }
  };

  const handleDeleteAllJobs = async () => {
    if (!window.confirm('Delete ALL jobs permanently?')) return;
    try {
      const data = await deleteAllJobs();
      if (data?.message) {
        setMessage(data.message);
      }
      await fetchJobs();
      await fetchStats();
    } catch (err) {
      setError(err.message || 'Unable to delete all jobs');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      const data = await deleteUser(userId);
      if (data?.message) {
        setMessage(data.message);
      }
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Unable to delete user');
    }
  };

  const toggleJobSelection = (jobId) => {
    setSelectedJobs((prev) => {
      if (prev.includes(jobId)) {
        return prev.filter((id) => id !== jobId);
      }
      return [...prev, jobId];
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedJobs.length === 0) {
      setError('Please select at least one job to delete.');
      return;
    }
    if (!window.confirm(`Delete ${selectedJobs.length} selected job(s) permanently?`)) return;

    try {
      for (const jobId of selectedJobs) {
        const data = await deleteJob(jobId);
        if (data?.message) {
          setMessage(data.message);
        }
      }
      setSelectedJobs([]);
      await fetchJobs();
      await fetchStats();
    } catch (err) {
      setError(err.message || 'Unable to delete selected jobs');
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') return;

    if (activeTab === 'jobs') {
      fetchJobs();
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [user, activeTab, currentPage, filterStatus, filterCategory]);

  const changeStatus = async (id, status) => {
    try {
      const data = await updateJobStatus(id, status);
      if (data?.message) throw new Error(data.message);
      setMessage(`Job ${status}`);
      await fetchJobs();
      await fetchStats();
    } catch (err) {
      setError(err.message || 'Operation failed');
    }
  };

  const prevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const nextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  if (!user || user.role !== 'admin') {
    return <div className="page"><h2>Admin access required</h2><p>Please login as admin.</p></div>;
  }

  return (
    <div className="page">
      <h2>Admin Dashboard</h2>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="admin-actions">
        <button onClick={() => setActiveTab('jobs')} style={{ background: activeTab === 'jobs' ? '#0c6' : '#eee', color: activeTab === 'jobs' ? '#fff' : '#000' }}>Jobs</button>
        <button onClick={() => setActiveTab('users')} style={{ background: activeTab === 'users' ? '#0c6' : '#eee', color: activeTab === 'users' ? '#fff' : '#000', marginLeft: '8px' }}>Users</button>
      </section>

      {activeTab === 'jobs' && (
        <>
          <section className="admin-actions">
            <button onClick={fetchJobs}>Refresh Pending</button>
            <button onClick={fetchStats}>Refresh Stats</button>
            <button onClick={handleDownloadCsv}>Download CSV</button>
            <button onClick={handleDeleteSelected} style={{ marginLeft: '10px', background: '#b22', color: '#fff' }}>Delete selected jobs</button>
          </section>
        </>
      )}

      {stats && (
        <div className="admin-stats">
          <p>Total jobs: {stats.total}</p>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <h4>Status counts</h4>
              {stats.statuses.map((item) => (
                <p key={item.status}>{item.status}: {item.count}</p>
              ))}
            </div>
            <div>
              <h4>Category counts</h4>
              {stats.categories.map((item) => (
                <p key={item.category}>{item.category}: {item.count}</p>
              ))}
            </div>
          </div>

          <div style={{ maxWidth: '650px', marginTop: '16px' }}>
            <Bar
              data={{
                labels: stats.categories.map((i) => i.category),
                datasets: [{
                  label: 'Jobs by category',
                  data: stats.categories.map((i) => i.count),
                  backgroundColor: 'rgba(15, 76, 129, 0.7)',
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Jobs per category' } },
              }}
            />
          </div>

          <div style={{ maxWidth: '650px', marginTop: '16px' }}>
            <Bar
              data={{
                labels: stats.statuses.map((i) => i.status),
                datasets: [{
                  label: 'Jobs by status',
                  data: stats.statuses.map((i) => i.count),
                  backgroundColor: 'rgba(49, 151, 149, 0.7)',
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Jobs by status' } },
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <section style={{ marginBottom: '16px' }}>
          <h3>Users</h3>
          {users.length === 0 ? (
            <p>No users found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #ccc' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #ccc' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #ccc' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #ccc' }}>Verified</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #ccc' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((usr) => (
                  <tr key={usr.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{usr.name}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{usr.email}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{usr.role}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{usr.emailValidated ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                      <button onClick={() => handleDeleteUser(usr.id)} style={{ background: '#b22', color: '#fff' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {activeTab === 'jobs' && (
        <>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ marginRight: '10px' }}>
              Status:
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ marginLeft: '6px' }}>
                <option value="">All</option>
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="expired">expired</option>
              </select>
            </label>

            <label>
              Category:
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ marginLeft: '6px' }}>
                <option value="">All</option>
                {stats?.categories?.map((c) => <option key={c.category} value={c.category}>{c.category}</option>)}
              </select>
            </label>
          </div>

          <h3>Jobs</h3>
          {jobs.length === 0 ? <p>No jobs found.</p> : jobs.map((job) => (
        <div key={job.id} className="job-card">
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={selectedJobs.includes(job.id)}
              onChange={() => toggleJobSelection(job.id)}
              style={{ marginRight: '8px' }}
            />
            <strong>{job.title}</strong>
          </label>
          <p>{job.description}</p>
          <p><strong>Category:</strong> {job.category}</p>
          <p><strong>Location:</strong> {job.city ? `${job.city}, ${job.province}` : job.province}</p>
          <p><strong>Status:</strong> {job.status}</p>
          <p><strong>Expires at:</strong> {new Date(job.expiresAt).toLocaleString()}</p>
          <div>
            <button onClick={() => changeStatus(job.id, 'approved')}>Approve</button>
            <button onClick={() => changeStatus(job.id, 'rejected')} style={{ marginLeft: '8px', background: '#b22' }}>Reject</button>
            <button onClick={() => handleDeleteJob(job.id)} style={{ marginLeft: '8px', background: '#b22', color: '#fff' }}>Delete</button>
          </div>
        </div>
      ))}

          <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={prevPage} disabled={currentPage === 1}>Prev</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button onClick={nextPage} disabled={currentPage >= totalPages}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
