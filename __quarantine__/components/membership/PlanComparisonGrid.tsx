'use client';

import React from 'react';

interface PlanComparisonGridProps {
  currentMembership: 'free' | 'garden' | 'pro';
  onUpgrade: (tier: 'garden' | 'pro') => Promise<void>;
}

const plans = [
  {
    id: 'free',
    name: 'FREE',
    price: '$0',
    period: '/month',
    features: [
      '25 regular scans/month',
      '0 doctor scans',
      'Basic scanner access',
      'Strain library',
    ],
    cta: 'Current Plan',
    disabled: false,
  },
  {
    id: 'garden',
    name: 'GARDEN',
    price: '$9.99',
    period: '/month',
    features: [
      'Unlimited grow logbooks',
      'Daily logs & photos',
      'AI grow guidance',
      '100 regular scans/month',
      '20 doctor scans/month',
      'Includes scanner access',
    ],
    cta: 'Upgrade to Garden',
    disabled: false,
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '$39.99',
    period: '/month',
    features: [
      '300 regular scans/month',
      '50 doctor scans/month',
      'All Garden features',
      'Compliance tools',
      'METRC integration',
      'Advanced analytics',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    disabled: false,
  },
];

export default function PlanComparisonGrid({ currentMembership, onUpgrade }: PlanComparisonGridProps) {
  const getCTA = (planId: string) => {
    if (planId === currentMembership) {
      return 'Current Plan';
    }
    if (currentMembership === 'free' && planId === 'garden') {
      return 'Upgrade to Garden';
    }
    if (currentMembership === 'free' && planId === 'pro') {
      return 'Upgrade to Pro';
    }
    if (currentMembership === 'garden' && planId === 'pro') {
      return 'Upgrade to Pro';
    }
    if (currentMembership === 'pro' && planId === 'pro') {
      return 'Manage Billing';
    }
    return 'Upgrade';
  };

  const handleCTAClick = async (planId: string) => {
    if (planId === currentMembership) {
      return; // Already on this plan
    }

    if (planId === 'garden' && currentMembership === 'free') {
      await onUpgrade('garden');
    } else if (planId === 'pro' && (currentMembership === 'free' || currentMembership === 'garden')) {
      await onUpgrade('pro');
    } else if (planId === 'pro' && currentMembership === 'pro') {
      // Manage billing
      try {
        const response = await fetch('/api/billing/portal');
        if (!response.ok) throw new Error('Failed to get billing portal');
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      } catch (error) {
        alert('Billing portal not available yet');
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2">Choose Your Plan</h2>
      <p className="text-slate-400 mb-6">Grow Logbook + Grow Coach — $9.99/month</p>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentMembership;
          const ctaText = getCTA(plan.id);
          const isDisabled = plan.id === 'free' && currentMembership !== 'free';

          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 transition ${
                isCurrent
                  ? 'border-emerald-500 bg-slate-900/50'
                  : 'border-slate-800 bg-slate-900 hover:border-emerald-500'
              } ${isDisabled ? 'opacity-50' : ''}`}
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-100 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-emerald-400">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-500 mt-1">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCTAClick(plan.id)}
                disabled={isCurrent || isDisabled}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  isCurrent
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {ctaText}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

