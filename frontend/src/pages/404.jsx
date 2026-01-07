import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff'}}>
      <div style={{textAlign: 'center'}}>
        <h1 style={{fontSize: 72, margin: 0}}>404</h1>
        <p style={{opacity: 0.8}}>Page not found.</p>
        <div style={{marginTop: 20}}>
          <a href="/garden" style={{marginRight: 12, padding: '8px 16px', background: '#22c55e', color: '#000', borderRadius: 8, textDecoration: 'none', fontWeight: 600}}>Go to Garden</a>
          <a href="/" style={{padding: '8px 16px', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, color: '#fff', textDecoration: 'none'}}>Home</a>
        </div>
      </div>
    </div>
  );
}
