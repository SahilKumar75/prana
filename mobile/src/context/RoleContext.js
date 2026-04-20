import React, { createContext, useContext, useState } from 'react';
import { api } from '../lib/api';

// Demo profiles — fixed UUIDs match the seeded DB rows
export const DEMO_PROFILES = {
  doctor: {
    id:        '00000000-0000-0000-0000-000000000001',
    name:      'Dr. Arjun Sharma',
    role:      'doctor',
    specialty: 'General Medicine',
  },
  patient: {
    id:          '00000000-0000-0000-0000-000000000003',
    name:        'Priya Patel',
    role:        'patient',
    phone:       '+91 98765 43210',
    patientDbId: 'PAT-PRIY-3210',
  },
};

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role,    setRole]    = useState(null);   // 'doctor' | 'patient' | null
  const [profile, setProfile] = useState(null);

  const selectRole = (r) => {
    const p = DEMO_PROFILES[r];
    setRole(r);
    setProfile(p);
    if (r === 'doctor') {
      api.setAvailable(p.id, true).catch(() => {});
    }
  };

  const signOut = () => {
    if (role === 'doctor' && profile?.id) {
      api.setAvailable(profile.id, false).catch(() => {});
    }
    setRole(null);
    setProfile(null);
  };

  return (
    <RoleContext.Provider value={{ role, profile, selectRole, signOut }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext);
