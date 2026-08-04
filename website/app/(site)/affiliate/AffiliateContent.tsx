'use client';

import { motion } from 'framer-motion';
import { DollarSign, Users, Gift, MessageCircle, ArrowRight, ExternalLink, CheckCircle, Percent, Shield } from 'lucide-react';
import { StaggerChildren, StaggerItem, FadeIn } from '@/components/MotionWrappers';
import Link from 'next/link';

const steps = [
  {
    icon: MessageCircle,
    title: 'Apply via Discord',
    desc: 'Join our Discord server and open a ticket in the #affiliate-apply channel to submit your application.',
    color: 'text-stone-300',
    bg: 'bg-stone-300/10',
    border: 'border-stone-300/20',
  },
  {
    icon: Gift,
    title: 'Get Your Unique Code',
    desc: 'Once approved, you\'ll receive a personalized discount code to share with your audience. Customers enter your code at checkout to get their discount.',
    color: 'text-stone-300',
    bg: 'bg-stone-300/10',
    border: 'border-white/[0.06]',
  },
  {
    icon: Users,
    title: 'Share Your Discount Code',
    desc: 'Share your discount code on social media, Discord, YouTube, or your website. When customers enter your code at checkout, they get the discount and you earn commission.',
    color: 'text-stone-300',
    bg: 'bg-stone-300/10',
    border: 'border-stone-300/20',
  },
  {
    icon: DollarSign,
    title: 'Get Paid',
    desc: 'Payouts are processed monthly via PayPal. Track your earnings, referrals, and commission history in your affiliate dashboard.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
];

const benefits = [
  { text: '20% commission on every sale' },
  { text: 'Monthly payouts via PayPal' },
  { text: 'Custom discount codes for your audience' },
  { text: 'Real-time tracking dashboard' },
  { text: 'Dedicated affiliate support channel' },
  { text: 'Bonus incentives for top performers' },
];

export default function AffiliateContent() {
  return (
    <div className="pb-32 md:pb-40 px-6">
      <div className="max-w-4xl mx-auto space-y-16">

        {/* How It Works */}
        <section>
          <FadeIn>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">How It Works</h2>
            <p className="text-sm text-white/45 text-center mb-10 max-w-lg mx-auto">
              Become an affiliate in four simple steps and start earning from your audience.
            </p>
          </FadeIn>

          <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <StaggerItem key={i}>
                  <motion.div
                    className={`relative rounded-2xl border ${step.border} ${step.bg} p-6 card-3d`}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`size-12 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center shrink-0`}>
                        <Icon className={`size-6 ${step.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-white/20">STEP {i + 1}</span>
                        </div>
                        <h3 className="text-base font-bold text-white mb-1">{step.title}</h3>
                        <p className="text-xs text-white/50 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        </section>

        {/* Why Join */}
        <section>
          <FadeIn>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Why Join?</h2>
            <p className="text-sm text-white/45 text-center mb-8 max-w-lg mx-auto">
              We offer competitive commissions and full support for our affiliates.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {benefits.map((b, i) => (
              <FadeIn key={i} delay={0.05 * i}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <CheckCircle className="size-4 text-stone-300 shrink-0" />
                  <span className="text-sm text-white/60">{b.text}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Commission Structure */}
        <section>
          <FadeIn>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Commission Structure</h2>
            <p className="text-sm text-white/45 text-center mb-8 max-w-lg mx-auto">
              Earn on every paid referral — recurring for as long as they stay subscribed.
            </p>
          </FadeIn>

          <StaggerChildren className="grid grid-cols-1 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
            {[
              { tier: 'Standard', price: '$9.99', commission: '$2.00', percent: '20%', color: 'text-accent', border: 'border-accent/20' },
              { tier: 'Pro', price: '$14.99', commission: '$3.00', percent: '20%', color: 'text-pro', border: 'border-pro/20' },
              { tier: 'Ultimate', price: '$24.99', commission: '$5.00', percent: '20%', color: 'text-gold', border: 'border-gold/20' },
              { tier: 'Any Plan', price: '', commission: '20%', percent: 'Recurring', color: 'text-stone-300', border: 'border-white/[0.06]' },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <motion.div
                  className={`rounded-2xl border ${item.border} bg-white/[0.02] p-6 text-center card-3d`}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Percent className={`size-8 ${item.color} mx-auto mb-3 opacity-60`} />
                  <h3 className={`text-lg font-bold ${item.color}`}>{item.tier}</h3>
                  {item.price && <p className="text-2xl font-extrabold text-white mt-1">{item.price}<span className="text-xs text-white/35 font-normal">/mo</span></p>}
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <p className="text-xs text-white/35">Commission</p>
                    <p className={`text-lg font-bold ${item.color}`}>{item.commission}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{item.percent}</p>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </section>

        {/* CTA */}
        <FadeIn>
          <div className="max-w-lg mx-auto text-center">
            <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent p-8">
              <div className="size-14 rounded-2xl bg-stone-300/10 border border-stone-300/20 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="size-7 text-stone-300" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Ready to Start Earning?</h2>
              <p className="text-sm text-white/45 mb-6 max-w-sm mx-auto">
                Join our Discord server and apply in the <span className="text-white/70 font-mono text-xs">#affiliate-apply</span> channel. Our team reviews applications within 48 hours.
              </p>
              <a
                href="https://discord.gg/ssQXKzA2HU"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-300 text-black text-sm font-semibold hover:bg-stone-200 transition-all shadow-lg shadow-black/20"
              >
                <MessageCircle className="size-4" />
                Apply on Discord
                <ExternalLink className="size-3.5 opacity-60" />
              </a>
              <p className="text-[10px] text-white/25 mt-4">
                By applying, you agree to our affiliate terms and conditions.
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Discord Link */}
        <FadeIn delay={0.1}>
          <div className="text-center">
            <a
              href="https://discord.gg/ssQXKzA2HU"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-white/35 hover:text-accent/60 transition-colors duration-300"
            >
              <span className="size-1.5 rounded-full bg-accent/40" />
              Have questions? Join our Discord — we respond within 24 hours
            </a>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
