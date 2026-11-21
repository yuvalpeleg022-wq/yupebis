import { useEffect, useId, useRef, useState } from 'react';
import { brand } from '../config/brand';
import { motorcycles } from '../data/motorcycles';
import { isFormLive, submitTestRide } from '../services/testRide';
import { Alert, ArrowRight, Check } from './Icons';
import { Reveal } from './Reveal';
import './TestRide.css';

interface Props {
  /** Motorcycle to preselect (set when a "Book a Test Ride" button is used) */
  preferredBikeId: string | null;
  /** Bumps every time a booking button is pressed, so the same bike can be re-applied */
  prefillNonce: number;
  onOpenPrivacy: () => void;
}

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  motorcycleId: string;
  preferredDate: string;
  message: string;
  consent: boolean;
}
type Errors = Partial<Record<keyof FormState, string>>;

const empty: FormState = {
  fullName: '',
  email: '',
  phone: '',
  motorcycleId: '',
  preferredDate: '',
  message: '',
  consent: false,
};

const toISODate = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

function dateBounds() {
  const min = new Date();
  min.setDate(min.getDate() + 1);
  const max = new Date();
  max.setMonth(max.getMonth() + 6);
  return { min: toISODate(min), max: toISODate(max) };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v: FormState): Errors {
  const e: Errors = {};
  const { min, max } = dateBounds();
  if (v.fullName.trim().length < 2) e.fullName = 'Please enter your full name.';
  if (!v.email.trim()) e.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'That email address doesn’t look right — please check it.';
  const digits = v.phone.replace(/\D/g, '');
  if (!v.phone.trim()) e.phone = 'Please enter a phone number so we can confirm your slot.';
  else if (digits.length < 7 || digits.length > 15 || /[^\d\s()+.-]/.test(v.phone))
    e.phone = 'Please enter a valid phone number (7–15 digits, optionally starting with +).';
  if (!v.motorcycleId) e.motorcycleId = 'Please choose the motorcycle you’d like to ride.';
  if (!v.preferredDate) e.preferredDate = 'Please choose a preferred date.';
  else if (v.preferredDate < min) e.preferredDate = 'Please choose a date from tomorrow onwards.';
  else if (v.preferredDate > max) e.preferredDate = 'We take bookings up to six months ahead.';
  if (v.message.length > 1000) e.message = 'Please keep your message under 1,000 characters.';
  if (!v.consent) e.consent = 'Please confirm you’re happy for us to contact you about this request.';
  return e;
}

const fieldOrder: (keyof FormState)[] = [
  'fullName',
  'email',
  'phone',
  'motorcycleId',
  'preferredDate',
  'message',
  'consent',
];

export function TestRide({ preferredBikeId, prefillNonce, onOpenPrivacy }: Props) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [resultMode, setResultMode] = useState<'demo' | 'live'>('demo');
  const [submittedName, setSubmittedName] = useState('');
  const { min, max } = dateBounds();

  useEffect(() => {
    if (preferredBikeId) setValues((v) => ({ ...v, motorcycleId: preferredBikeId }));
  }, [preferredBikeId, prefillNonce]);

  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
  }, [status]);

  const id = (k: string) => `${uid}-${k}`;

  const update = <K extends keyof FormState>(k: K, val: FormState[K]) => {
    const next = { ...values, [k]: val };
    setValues(next);
    if (touched[k] || errors[k]) setErrors((prev) => ({ ...prev, [k]: validate(next)[k] }));
  };

  const blur = (k: keyof FormState) => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors((prev) => ({ ...prev, [k]: validate(values)[k] }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    setTouched(Object.fromEntries(fieldOrder.map((k) => [k, true])));
    const first = fieldOrder.find((k) => errs[k]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setStatus('submitting');
    try {
      const bike = motorcycles.find((m) => m.id === values.motorcycleId);
      const res = await submitTestRide({
        ...values,
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        message: values.message.trim(),
        motorcycleName: bike?.name ?? 'Not sure yet',
        submittedAt: new Date().toISOString(),
      });
      setResultMode(res.mode);
      setSubmittedName(values.fullName.trim().split(/\s+/)[0]);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const reset = () => {
    setValues(empty);
    setErrors({});
    setTouched({});
    setStatus('idle');
  };

  const err = (k: keyof FormState) =>
    errors[k] ? (
      <p className="field__error" id={id(`${k}-err`)}>
        <Alert /> {errors[k]}
      </p>
    ) : null;

  const describedBy = (k: keyof FormState, hint?: boolean) =>
    [hint ? id(`${k}-hint`) : '', errors[k] ? id(`${k}-err`) : ''].filter(Boolean).join(' ') || undefined;

  const bikeName = motorcycles.find((m) => m.id === values.motorcycleId)?.name;

  return (
    <section id="contact" className="section testride" aria-labelledby="testride-title">
      <div className="container testride__grid">
        <Reveal className="testride__intro">
          <p className="eyebrow">Contact · Test ride</p>
          <h2 id="testride-title" className="h2">
            Feel it
            <br />
            for yourself.
          </h2>
          <p className="lede">
            Tell us which motorcycle you'd like to ride and when suits you. A specialist will get back to you to confirm
            the time, route and gear.
          </p>

          <div className="testride__info">
            <div>
              <h3>Showroom</h3>
              <address>
                {brand.contact.addressLines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </address>
              <span className="demo-tag">Location placeholder</span>
            </div>
            <div>
              <h3>Opening hours</h3>
              <dl>
                {brand.contact.hours.map((h) => (
                  <div key={h.days}>
                    <dt>{h.days}</dt>
                    <dd>{h.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h3>Direct</h3>
              <p>
                {brand.contact.phoneHref ? <a href={brand.contact.phoneHref}>{brand.contact.phone}</a> : brand.contact.phone}
                <br />
                {brand.contact.emailHref ? <a href={brand.contact.emailHref}>{brand.contact.email}</a> : brand.contact.email}
              </p>
              <span className="demo-tag">Contact placeholder</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="testride__panel" delay={100}>
          {status === 'success' ? (
            <div className="testride__success" ref={successRef} tabIndex={-1} role="status">
              <span className="testride__success-icon" aria-hidden="true">
                <Check />
              </span>
              <h3>
                {resultMode === 'live' ? `Thanks, ${submittedName} — request received.` : `Thanks, ${submittedName}.`}
              </h3>
              {resultMode === 'live' ? (
                <p>
                  Your test-ride request for the <strong>{bikeName ?? 'motorcycle'}</strong> has been sent. We'll contact you
                  to confirm the details.
                </p>
              ) : (
                <>
                  <p>
                    Your details passed validation and the request for the <strong>{bikeName ?? 'motorcycle'}</strong> was
                    prepared successfully.
                  </p>
                  <p className="testride__demo-note">
                    <strong>Demo mode:</strong> this showcase isn't connected to a booking system yet, so no request has
                    been sent and no one will contact you.
                  </p>
                </>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
                Submit another request
              </button>
            </div>
          ) : (
            <form ref={formRef} className="form" noValidate onSubmit={onSubmit} aria-describedby={isFormLive ? undefined : id('form-note')}>
              {!isFormLive && (
                <p className="form__demo" id={id('form-note')}>
                  <span className="demo-tag">Demo form</span> Validation works fully; submissions are not sent anywhere.
                </p>
              )}

              <div className="form__row">
                <div className={`field ${errors.fullName ? 'has-error' : ''}`}>
                  <label htmlFor={id('fullName')}>
                    Full name <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id={id('fullName')}
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={values.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                    onBlur={() => blur('fullName')}
                    aria-invalid={!!errors.fullName}
                    aria-describedby={describedBy('fullName')}
                    required
                  />
                  {err('fullName')}
                </div>
              </div>

              <div className="form__row form__row--2">
                <div className={`field ${errors.email ? 'has-error' : ''}`}>
                  <label htmlFor={id('email')}>
                    Email <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id={id('email')}
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={(e) => update('email', e.target.value)}
                    onBlur={() => blur('email')}
                    aria-invalid={!!errors.email}
                    aria-describedby={describedBy('email')}
                    required
                  />
                  {err('email')}
                </div>
                <div className={`field ${errors.phone ? 'has-error' : ''}`}>
                  <label htmlFor={id('phone')}>
                    Phone <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id={id('phone')}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={values.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    onBlur={() => blur('phone')}
                    aria-invalid={!!errors.phone}
                    aria-describedby={describedBy('phone')}
                    required
                  />
                  {err('phone')}
                </div>
              </div>

              <div className="form__row form__row--2">
                <div className={`field ${errors.motorcycleId ? 'has-error' : ''}`}>
                  <label htmlFor={id('motorcycleId')}>
                    Preferred motorcycle <span aria-hidden="true">*</span>
                  </label>
                  <div className="select">
                    <select
                      id={id('motorcycleId')}
                      name="motorcycleId"
                      value={values.motorcycleId}
                      onChange={(e) => update('motorcycleId', e.target.value)}
                      onBlur={() => blur('motorcycleId')}
                      aria-invalid={!!errors.motorcycleId}
                      aria-describedby={describedBy('motorcycleId')}
                      required
                    >
                      <option value="" disabled>
                        Select a model
                      </option>
                      {motorcycles.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.category}
                        </option>
                      ))}
                      <option value="undecided">Not sure yet — advise me</option>
                    </select>
                  </div>
                  {err('motorcycleId')}
                </div>
                <div className={`field ${errors.preferredDate ? 'has-error' : ''}`}>
                  <label htmlFor={id('preferredDate')}>
                    Preferred date <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id={id('preferredDate')}
                    name="preferredDate"
                    type="date"
                    min={min}
                    max={max}
                    value={values.preferredDate}
                    onChange={(e) => update('preferredDate', e.target.value)}
                    onBlur={() => blur('preferredDate')}
                    aria-invalid={!!errors.preferredDate}
                    aria-describedby={describedBy('preferredDate')}
                    required
                  />
                  {err('preferredDate')}
                </div>
              </div>

              <div className="form__row">
                <div className={`field ${errors.message ? 'has-error' : ''}`}>
                  <label htmlFor={id('message')}>
                    Message <span className="field__optional">Optional</span>
                  </label>
                  <textarea
                    id={id('message')}
                    name="message"
                    rows={4}
                    maxLength={1200}
                    placeholder="Riding experience, preferred time of day, questions about the bike…"
                    value={values.message}
                    onChange={(e) => update('message', e.target.value)}
                    onBlur={() => blur('message')}
                    aria-invalid={!!errors.message}
                    aria-describedby={describedBy('message', true)}
                  />
                  <p className="field__hint" id={id('message-hint')}>
                    {values.message.length} / 1,000
                  </p>
                  {err('message')}
                </div>
              </div>

              <div className={`field field--check ${errors.consent ? 'has-error' : ''}`}>
                <label className="check">
                  <input
                    name="consent"
                    type="checkbox"
                    checked={values.consent}
                    onChange={(e) => update('consent', e.target.checked)}
                    onBlur={() => blur('consent')}
                    aria-invalid={!!errors.consent}
                    aria-describedby={describedBy('consent')}
                    required
                  />
                  <span className="check__box" aria-hidden="true">
                    <Check />
                  </span>
                  <span>
                    I agree to be contacted about this test-ride request and accept the{' '}
                    <button type="button" className="inline-link" onClick={onOpenPrivacy}>
                      privacy policy
                    </button>
                    .{' '}
                    <span aria-hidden="true">*</span>
                  </span>
                </label>
                {err('consent')}
              </div>

              {status === 'error' && (
                <p className="form__error" role="alert">
                  <Alert /> Something went wrong sending your request. Please try again in a moment.
                </p>
              )}

              <div className="form__footer">
                <p className="form__required">
                  <span aria-hidden="true">*</span> Required fields
                </p>
                <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
                  {status === 'submitting' ? (
                    <>
                      <span className="spinner spinner--sm" aria-hidden="true" /> Sending…
                    </>
                  ) : (
                    <>
                      Request Test Ride <ArrowRight />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
