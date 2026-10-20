import React from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import type { ValidationResult } from '../../types/routine'

interface ValidationBannerProps {
  validation: ValidationResult
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  validation,
}) => {
  const getBannerStyles = () => {
    switch (validation.status) {
      case 'VALID':
        return {
          container: 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200',
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />,
          title: 'Routine Status: VALID',
          titleColor: 'text-emerald-300',
        }
      case 'NEEDS_APPROVAL':
        return {
          container: 'bg-amber-950/30 border-amber-500/40 text-amber-200',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />,
          title: 'Routine Status: NEEDS APPROVAL',
          titleColor: 'text-amber-300',
        }
      case 'BLOCKED':
        return {
          container: 'bg-rose-950/30 border-rose-500/50 text-rose-200',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          icon: <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />,
          title: 'Routine Status: BLOCKED',
          titleColor: 'text-rose-300',
        }
    }
  }

  const styles = getBannerStyles()

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-300 ${styles.container}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="mt-0.5">{styles.icon}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className={`text-base font-bold tracking-tight ${styles.titleColor}`}>
                {styles.title}
              </h4>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wide ${styles.badge}`}
              >
                {validation.status}
              </span>
            </div>
            <p className="text-sm opacity-90 leading-relaxed max-w-2xl">
              {validation.summary}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end text-xs opacity-70 shrink-0">
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{validation.validatedAt}</span>
          </span>
          <span className="flex items-center space-x-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Guard Policy v1.0</span>
          </span>
        </div>
      </div>
    </div>
  )
}
