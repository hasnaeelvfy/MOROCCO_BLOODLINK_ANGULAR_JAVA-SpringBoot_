import { Routes } from '@angular/router';
import { guestGuard, roleGuard, signedInGuard } from './guards/auth.guard';
import { AboutPageComponent } from './pages/about/about-page.component';
import { AdminAuditPageComponent } from './pages/admin-audit/admin-audit-page.component';
import { AdminHospitalsPageComponent } from './pages/admin-hospitals/admin-hospitals-page.component';
import { AdminMatchesPageComponent } from './pages/admin-matches/admin-matches-page.component';
import { AdminRequestsPageComponent } from './pages/admin-requests/admin-requests-page.component';
import { AdminUsersPageComponent } from './pages/admin-users/admin-users-page.component';
import { AdminDonorsPageComponent } from './pages/admin-donors/admin-donors-page.component';
import { AdminDonationsPageComponent } from './pages/admin-donations/admin-donations-page.component';
import { AdminPageComponent } from './pages/admin/admin-page.component';
import { AdminPortalComponent } from './pages/admin-portal/admin-portal.component';
import { AppLayoutComponent } from './pages/app-layout/app-layout.component';
import { AvailabilityPageComponent } from './pages/availability/availability-page.component';
import { CommunicationPageComponent } from './pages/communication/communication-page.component';
import { ContactPageComponent } from './pages/contact/contact-page.component';
import { DonorAuthPageComponent } from './pages/donor-auth/donor-auth-page.component';
import { DonorPortalComponent } from './pages/donor-portal/donor-portal.component';
import { DonorProfilePageComponent } from './pages/donor-profile/donor-profile-page.component';
import { DonorRegisterPageComponent } from './pages/donor-register/donor-register-page.component';
import { DonorInstitutionPageComponent } from './pages/donor-institution/donor-institution-page.component';
import { DonorSettingsPageComponent } from './pages/donor-settings/donor-settings-page.component';
import { DonorPageComponent } from './pages/donor/donor-page.component';
import { EligibilityPageComponent } from './pages/eligibility/eligibility-page.component';
import { ForbiddenPageComponent } from './pages/forbidden/forbidden-page.component';
import { ForgotPasswordPageComponent } from './pages/forgot-password/forgot-password-page.component';
import { HistoryPageComponent } from './pages/history/history-page.component';
import { HospitalAuthPageComponent } from './pages/hospital-auth/hospital-auth-page.component';
import { HospitalMatchesPageComponent } from './pages/hospital-matches/hospital-matches-page.component';
import { HospitalMessagesPageComponent } from './pages/hospital-messages/hospital-messages-page.component';
import { HospitalNotificationsPageComponent } from './pages/hospital-notifications/hospital-notifications-page.component';
import { HospitalPortalComponent } from './pages/hospital-portal/hospital-portal.component';
import { HospitalProfilePageComponent } from './pages/hospital-profile/hospital-profile-page.component';
import { HospitalDonorPageComponent } from './pages/hospital-donor/hospital-donor-page.component';
import { HospitalRegisterPageComponent } from './pages/hospital-register/hospital-register-page.component';
import { HospitalRequestsPageComponent } from './pages/hospital-requests/hospital-requests-page.component';
import { HospitalSettingsPageComponent } from './pages/hospital-settings/hospital-settings-page.component';
import { HospitalThreadPageComponent } from './pages/hospital-thread/hospital-thread-page.component';
import { HospitalPageComponent } from './pages/hospital/hospital-page.component';
import { InvitationsPageComponent } from './pages/invitations/invitations-page.component';
import { MatchingPageComponent } from './pages/matching/matching-page.component';
import { NotFoundPageComponent } from './pages/not-found/not-found-page.component';
import { NotificationsPageComponent } from './pages/notifications/notifications-page.component';
import { PrivacyPageComponent } from './pages/privacy/privacy-page.component';
import { RequestCreatePageComponent } from './pages/request-create/request-create-page.component';
import { RequestDetailPageComponent } from './pages/request-detail/request-detail-page.component';
import { RequestEditPageComponent } from './pages/request-edit/request-edit-page.component';
import { RoleSignInPageComponent } from './pages/role-sign-in/role-sign-in-page.component';
import { SafetyPageComponent } from './pages/safety/safety-page.component';
import { SignInPageComponent } from './pages/sign-in/sign-in-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', children: [] },
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: 'hospital/auth', component: HospitalAuthPageComponent, canActivate: [guestGuard] },
      { path: 'hospital/register', component: HospitalRegisterPageComponent, canActivate: [guestGuard] },
      { path: 'hospital/sign-in', component: RoleSignInPageComponent, data: { role: 'hospital' }, canActivate: [guestGuard] },
      { path: 'donor/auth', component: DonorAuthPageComponent, canActivate: [guestGuard] },
      { path: 'donor/register', component: DonorRegisterPageComponent, canActivate: [guestGuard] },
      { path: 'donor/sign-in', component: RoleSignInPageComponent, data: { role: 'donor' }, canActivate: [guestGuard] },
      { path: 'admin/sign-in', component: RoleSignInPageComponent, data: { role: 'admin' }, canActivate: [guestGuard] },
      { path: 'sign-in', component: SignInPageComponent, canActivate: [guestGuard] },
      { path: 'register', redirectTo: 'donor/auth', pathMatch: 'full' },
      { path: 'forgot-password', component: ForgotPasswordPageComponent },
      { path: 'about', component: AboutPageComponent },
      { path: 'safety', component: SafetyPageComponent },
      { path: 'privacy', component: PrivacyPageComponent },
      { path: 'contact', component: ContactPageComponent },
      { path: 'forbidden', component: ForbiddenPageComponent },
      { path: 'notifications', component: NotificationsPageComponent, canActivate: [signedInGuard] },
      { path: 'hospital/communication/:requestId', component: CommunicationPageComponent, canActivate: [signedInGuard] },
      { path: 'find-blood', redirectTo: 'hospital/auth', pathMatch: 'full' },
      { path: 'coverage', redirectTo: '/', pathMatch: 'full' },
      { path: 'request', redirectTo: 'hospital/requests/new', pathMatch: 'full' }
    ]
  },
  {
    path: 'hospital',
    component: HospitalPortalComponent,
    canActivate: [roleGuard(['hospital'])],
    children: [
      { path: '', component: HospitalPageComponent },
      { path: 'requests/new', component: RequestCreatePageComponent },
      { path: 'requests/:requestId/edit', component: RequestEditPageComponent },
      { path: 'requests/:requestId', component: RequestDetailPageComponent },
      { path: 'requests', component: HospitalRequestsPageComponent },
      { path: 'matching/:requestId', component: MatchingPageComponent },
      { path: 'matches', component: HospitalMatchesPageComponent },
      { path: 'donors/:donorId', component: HospitalDonorPageComponent },
      { path: 'notifications', component: HospitalNotificationsPageComponent },
      { path: 'messages/:requestId', component: HospitalThreadPageComponent },
      { path: 'messages', component: HospitalMessagesPageComponent },
      { path: 'profile', component: HospitalProfilePageComponent },
      { path: 'settings', component: HospitalSettingsPageComponent }
    ]
  },
  {
    path: 'donor',
    component: DonorPortalComponent,
    canActivate: [roleGuard(['donor'])],
    children: [
      { path: '', component: DonorPageComponent },
      { path: 'profile', component: DonorProfilePageComponent },
      { path: 'hospitals/:hospitalId', component: DonorInstitutionPageComponent },
      { path: 'eligibility', component: EligibilityPageComponent },
      { path: 'availability', component: AvailabilityPageComponent },
      { path: 'invitations', component: InvitationsPageComponent },
      { path: 'history', component: HistoryPageComponent },
      { path: 'notifications', component: NotificationsPageComponent },
      { path: 'messages/:requestId', component: CommunicationPageComponent },
      { path: 'settings', component: DonorSettingsPageComponent }
    ]
  },
  {
    path: 'admin',
    component: AdminPortalComponent,
    canActivate: [roleGuard(['admin'])],
    children: [
      { path: '', component: AdminPageComponent },
      { path: 'users', component: AdminUsersPageComponent },
      { path: 'donors', component: AdminDonorsPageComponent },
      { path: 'hospitals', component: AdminHospitalsPageComponent },
      { path: 'requests', component: AdminRequestsPageComponent },
      { path: 'matches', component: AdminMatchesPageComponent },
      { path: 'donations', component: AdminDonationsPageComponent },
      { path: 'audit-log', component: AdminAuditPageComponent }
    ]
  },
  {
    path: '',
    component: AppLayoutComponent,
    children: [{ path: '**', component: NotFoundPageComponent }]
  }
];
