# Mobile settings inventory — 23 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Scope: SET-01..03. Source scan; not a claim of complete translation or device QA.

74 TSX files scanned; 667 candidate literal occurrences extracted. Dynamic strings, server errors, notification copy and native prompts require manual review during SET-04.

Device override → account default → system. `system` is a device mode, never a value sent to existing `profiles.locale`. No API/schema changes in this increment. Device settings use their own versioned SecureStore key; financial backups and AI consent remain separate.

| Source | Lines | Static mobile palette | Fixed formatter/locale |
| --- | ---: | --- | --- |
| `apps/mobile/src/app/(auth)/_layout.tsx` | 10 |  |  |
| `apps/mobile/src/app/(auth)/forgot-password.tsx` | 38 |  |  |
| `apps/mobile/src/app/(auth)/login.tsx` | 57 |  |  |
| `apps/mobile/src/app/(auth)/register.tsx` | 45 |  |  |
| `apps/mobile/src/app/(auth)/verify-email.tsx` | 45 |  |  |
| `apps/mobile/src/app/_layout.tsx` | 71 | yes |  |
| `apps/mobile/src/app/accounts/[id].tsx` | 88 | yes |  |
| `apps/mobile/src/app/accounts/index.tsx` | 27 | yes | yes |
| `apps/mobile/src/app/accounts/new.tsx` | 54 | yes |  |
| `apps/mobile/src/app/admin.tsx` | 136 | yes | yes |
| `apps/mobile/src/app/auth/callback.tsx` | 12 |  |  |
| `apps/mobile/src/app/auth/reset-password.tsx` | 40 |  |  |
| `apps/mobile/src/app/billing.tsx` | 360 | yes |  |
| `apps/mobile/src/app/bills/[id].tsx` | 68 | yes |  |
| `apps/mobile/src/app/bills/index.tsx` | 37 | yes | yes |
| `apps/mobile/src/app/bills/new.tsx` | 54 | yes |  |
| `apps/mobile/src/app/budgets/index.tsx` | 124 | yes | yes |
| `apps/mobile/src/app/capture/index.tsx` | 730 | yes |  |
| `apps/mobile/src/app/categories/[id].tsx` | 77 | yes |  |
| `apps/mobile/src/app/categories/index.tsx` | 22 | yes |  |
| `apps/mobile/src/app/categories/new.tsx` | 76 | yes |  |
| `apps/mobile/src/app/delete-account.tsx` | 53 | yes |  |
| `apps/mobile/src/app/index.tsx` | 66 | yes | yes |
| `apps/mobile/src/app/insights.tsx` | 63 | yes | yes |
| `apps/mobile/src/app/keepsakes.tsx` | 148 | yes | yes |
| `apps/mobile/src/app/notifications.tsx` | 102 | yes |  |
| `apps/mobile/src/app/onboarding.tsx` | 135 | yes |  |
| `apps/mobile/src/app/planning.tsx` | 131 | yes | yes |
| `apps/mobile/src/app/profile.tsx` | 222 | yes |  |
| `apps/mobile/src/app/receipt-saved.tsx` | 23 | yes |  |
| `apps/mobile/src/app/receipts/[id].tsx` | 361 | yes | yes |
| `apps/mobile/src/app/reconcile.tsx` | 148 | yes | yes |
| `apps/mobile/src/app/restore.tsx` | 233 | yes |  |
| `apps/mobile/src/app/review-inbox.tsx` | 77 | yes | yes |
| `apps/mobile/src/app/settings-preview.tsx` | 55 |  |  |
| `apps/mobile/src/app/subscriptions/[id].tsx` | 19 | yes | yes |
| `apps/mobile/src/app/subscriptions/index.tsx` | 27 | yes | yes |
| `apps/mobile/src/app/subscriptions/new.tsx` | 29 | yes |  |
| `apps/mobile/src/app/sync-conflicts.tsx` | 117 | yes | yes |
| `apps/mobile/src/app/transactions/[id]/refund.tsx` | 101 | yes | yes |
| `apps/mobile/src/app/transactions/[id]/splits.tsx` | 163 | yes | yes |
| `apps/mobile/src/app/transactions/[id].tsx` | 192 | yes | yes |
| `apps/mobile/src/app/transactions/bulk.tsx` | 71 | yes | yes |
| `apps/mobile/src/app/transactions/index.tsx` | 58 | yes | yes |
| `apps/mobile/src/app/transactions/new.tsx` | 393 | yes | yes |
| `apps/mobile/src/app/transactions/transfer.tsx` | 65 | yes |  |
| `apps/mobile/src/core/local/guest-finance-context.tsx` | 63 |  |  |
| `apps/mobile/src/core/receipts/receipt-gallery-photo.tsx` | 24 | yes |  |
| `apps/mobile/src/core/ui/accessible-pressable.tsx` | 46 |  |  |
| `apps/mobile/src/core/ui/app-icon.tsx` | 9 | yes |  |
| `apps/mobile/src/core/ui/brand-logo.tsx` | 5 |  |  |
| `apps/mobile/src/core/ui/date-field.tsx` | 36 | yes |  |
| `apps/mobile/src/core/ui/home-receipt-calendar.tsx` | 126 | yes |  |
| `apps/mobile/src/core/ui/month-calendar.tsx` | 12 | yes |  |
| `apps/mobile/src/core/ui/navigation-shell.tsx` | 67 | yes |  |
| `apps/mobile/src/core/ui/picket-text-input.tsx` | 32 | yes |  |
| `apps/mobile/src/core/ui/picket-ui.tsx` | 173 | yes |  |
| `apps/mobile/src/core/ui/receipt-camera.tsx` | 39 | yes |  |
| `apps/mobile/src/features/accounts/accounts-context.tsx` | 201 |  |  |
| `apps/mobile/src/features/auth/auth-context.tsx` | 278 |  |  |
| `apps/mobile/src/features/auth/auth-screen.tsx` | 90 | yes |  |
| `apps/mobile/src/features/bills/bills-context.tsx` | 81 |  |  |
| `apps/mobile/src/features/budgets/budgets-context.tsx` | 36 |  |  |
| `apps/mobile/src/features/keepsakes/keepsake-photo.tsx` | 16 |  |  |
| `apps/mobile/src/features/notifications/reminder-coordinator.tsx` | 60 |  |  |
| `apps/mobile/src/features/partners/partner-notice.tsx` | 62 | yes |  |
| `apps/mobile/src/features/profile/profile-context.tsx` | 120 |  |  |
| `apps/mobile/src/features/security/device-lock.tsx` | 104 | yes |  |
| `apps/mobile/src/features/settings/appearance-provider.tsx` | 70 |  |  |
| `apps/mobile/src/features/subscriptions/subscriptions-context.tsx` | 29 |  |  |
| `apps/mobile/src/features/sync/sync-context.tsx` | 137 |  |  |
| `apps/mobile/src/features/sync/transaction-merge-editor.tsx` | 82 | yes | yes |
| `apps/mobile/src/features/transactions/transactions-context.tsx` | 396 |  |  |
| `apps/mobile/src/features/updates/app-update-section.tsx` | 63 | yes |  |

Runtime migration starts with shared UI, auth/lock, then user screens. Static palette imports in this table are deliberately retained until SET-04; adding providers alone does not complete the migration. The development-only `/settings-preview` route is the acceptance surface for this foundation.
