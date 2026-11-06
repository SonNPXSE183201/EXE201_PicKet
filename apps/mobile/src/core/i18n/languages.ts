import { conflictVi, conflictEn } from "./conflict-resources";
import { homeDesignVi, homeDesignEn } from "./home-design-resources";
import { billingVi, billingEn } from "./billing-resources";
import { assessmentVi, assessmentEn } from "./assessment-resources";
import { planningVi, planningEn } from "./planning-resources";
import { adminVi, adminEn } from "./admin-resources";
import { restoreVi, restoreEn } from "./restore-resources";
import { budgetsVi, budgetsEn } from "./budget-resources";
import { subscriptionsVi, subscriptionsEn } from "./subscription-resources";
import { billsVi, billsEn } from "./bill-resources";
import {accountDeletionVi,accountDeletionEn} from "./account-deletion-resources";
import {forecastObservationVi,forecastObservationEn} from "./forecast-observation-resources";
import {settlementCloudVi,settlementCloudEn} from "./settlement-cloud-resources";
import {reconciliationVi,reconciliationEn} from "./reconciliation-resources";
import { authEn, authVi } from "./auth-resources";
import { managementEn,managementVi } from "./management-resources";
import { notificationsEn,notificationsVi } from "./notification-resources";
import { transactionFormEn,transactionFormVi } from "./transaction-form-resources";
import { profileEn, profileVi } from "./profile-resources";
import { updatesEn, updatesVi } from "./update-resources";
import { learningAiEn, learningAiVi } from "./learning-ai-resources";
import { cashflowEn, cashflowVi } from "./cashflow-resources";
import { transactionsEn, transactionsVi } from "./transactions-resources";
import { securityEn, securityVi } from "./security-resources";
import { en, vi } from "./resources";
import { commonEn, commonVi } from "./common-resources";
import { learningEn, learningVi } from "./learning-resources";
import { calendarEn, calendarVi } from "./calendar-resources";
import { overviewEn, overviewVi } from "./overview-resources";
/** Add complete reviewed resources here; selectors and formatters use this registry. */
export const languages = {
  vi: { name: "Tiếng Việt", locale: "vi-VN", direction: "ltr", translation: vi, common: commonVi, learning: learningVi, learningAi: learningAiVi, calendar: calendarVi, overview: { ...overviewVi, ...homeDesignVi }, transactions: {...transactionsVi,...transactionFormVi}, security: securityVi, cashflow: {...cashflowVi,...settlementCloudVi}, auth: authVi, profile: profileVi, updates: updatesVi, management:managementVi, notifications:notificationsVi, reconciliation:reconciliationVi, forecastObservations:forecastObservationVi, accountDeletion:accountDeletionVi, bills:billsVi, subscriptions:subscriptionsVi, budgets:budgetsVi, restore:restoreVi, admin:adminVi, planning:planningVi, billing:billingVi, assessment:assessmentVi, conflicts:conflictVi },
  en: { name: "English", locale: "en-US", direction: "ltr", translation: en, common: commonEn, learning: learningEn, learningAi: learningAiEn, calendar: calendarEn, overview: { ...overviewEn, ...homeDesignEn }, transactions: {...transactionsEn,...transactionFormEn}, security: securityEn, cashflow: {...cashflowEn,...settlementCloudEn}, auth: authEn, profile: profileEn, updates: updatesEn, management:managementEn, notifications:notificationsEn, reconciliation:reconciliationEn, forecastObservations:forecastObservationEn, accountDeletion:accountDeletionEn, bills:billsEn, subscriptions:subscriptionsEn, budgets:budgetsEn, restore:restoreEn, admin:adminEn, planning:planningEn, billing:billingEn, assessment:assessmentEn, conflicts:conflictEn },
} as const;
export type AppLanguage = keyof typeof languages;
export const languageCodes = Object.keys(languages) as AppLanguage[];
