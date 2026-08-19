'use client';

import * as React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useDash } from './dashboard-i18n';

export interface FormProblem {
  /** What is wrong, phrased for the person filling the form. */
  message: string;
  /** Puts them in front of the thing that is wrong. */
  goTo: () => void;
}

/**
 * The list of what is stopping a save.
 *
 * A long form inside a scrolling dialog can fail validation entirely below the
 * fold — the button appears to do nothing. This collects every problem in one
 * place at the top, and each line walks you to the field, because being told
 * something is missing without being shown where is barely better than silence.
 */
export function FormProblems({ problems }: { problems: FormProblem[] }) {
  const { d } = useDash();
  const ref = React.useRef<HTMLDivElement>(null);

  // A fresh set of problems means a fresh failed submit: bring it into view.
  React.useEffect(() => {
    if (problems.length === 0) return;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [problems]);

  if (problems.length === 0) return null;

  return (
    <div
      ref={ref}
      role="alert"
      aria-live="assertive"
      className="animate-fade-down border border-error bg-surface-lowest p-4"
    >
      <p className="flex items-center gap-2 text-label-md text-error">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {problems.length === 1
          ? d.common.oneProblem
          : d.common.someProblems.replace('{n}', String(problems.length))}
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {problems.map((problem, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={problem.goTo}
              className="group flex w-full items-center gap-2 text-start text-body-sm text-secondary transition-colors hover:text-on-surface"
            >
              <span className="flex-1">{problem.message}</span>
              <span className="label-caps flex shrink-0 items-center gap-1 text-error">
                {d.common.takeMeThere}
                <ArrowRight className="h-3 w-3 transition-transform duration-200 ease-scandi group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
