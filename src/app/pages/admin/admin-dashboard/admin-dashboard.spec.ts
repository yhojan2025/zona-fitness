import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vitest } from 'vitest';
import { AdminDashboard } from './admin-dashboard';
import { AuthService } from '../../../core/auth.service';
import { AdminService } from '../../../core/admin.service';

describe('AdminDashboard Component', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;
  let authServiceSpy: any;
  let adminServiceSpy: any;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      user: () => ({ id: 1, name: 'Admin Principal', email: 'admin@zonafitness.com', role: 'admin' }),
      hasRole: (r: string) => r === 'admin',
      logout: () => {},
    };

    adminServiceSpy = {
      getMetrics: () =>
        of({
          users: { total: 10, active: 9, inactive: 1 },
          memberships: { total: 5, active: 4, expired: 1, expiring_soon: 1 },
          plans: { available: 4 },
          orders: { total: 8, approved: 7, pending: 1, cancelled: 0 },
          payments: { total: 3, pending_verifications: 1, approved: 2, rejected: 0 },
          revenue: {
            simulated_revenue: 1200000,
            real_revenue: 350000,
            disclaimer: 'Recaudo oficial consolidado',
          },
          recent_activity: { orders: [], memberships: [] },
        }),
      getUsers: () =>
        of([
          {
            id: 1,
            name: 'Admin Principal',
            email: 'admin@zonafitness.com',
            role: 'admin',
            is_active: true,
            active_plan_name: 'Platino',
            membership_days_left: 15,
          },
          {
            id: 2,
            name: 'Juan Perez',
            email: 'juan@test.com',
            role: 'user',
            is_active: true,
            active_plan_name: null,
            membership_days_left: 0,
          },
        ]),
      getPlans: () =>
        of([
          { id: 1, name: 'Cobre', slug: 'cobre', duration_days: 15, price: 45000, is_active: true, total_sold_count: 5 },
          { id: 2, name: 'Bronce', slug: 'bronce', duration_days: 30, price: 260000, is_active: true, total_sold_count: 3 },
          { id: 3, name: 'Platino', slug: 'platino', duration_days: 90, price: 500000, is_active: true, total_sold_count: 1 },
          { id: 4, name: 'Oro', slug: 'oro', duration_days: 365, price: 900000, is_active: true, total_sold_count: 2 },
        ]),
      getMemberships: () =>
        of([
          {
            id: 10,
            user_name: 'Carlos Gomez',
            user_email: 'carlos@test.com',
            plan_name: 'Bronce',
            start_date: '2026-10-01',
            end_date: '2026-10-31',
            duration_days: 30,
            days_remaining: 10,
            price_paid: 260000,
            is_simulated: true,
            computed_status: 'ACTIVA',
          },
        ]),
      getOrders: () => of([]),
      getPayments: () =>
        of([
          {
            id: 101,
            order_number: 'ZF-ORD-101',
            user_name: 'Carlos Gomez',
            user_email: 'carlos@test.com',
            amount: 260000,
            payment_method: 'transferencia',
            status: 'pending_verification',
            has_receipt: true,
            created_at: new Date().toISOString(),
          },
        ]),
      approvePayment: () => of({ success: true, message: 'Pago aprobado y membresía activada' }),
      rejectPayment: () => of({ success: true, message: 'Pago rechazado' }),
      bulkUpdateUserStatus: () => of({ success: true, processed: [2], omitted: [], count: 1, message: 'Operación completada' }),
      bulkDeleteUsers: () => of({ success: true, processed: [2], omitted: [], count: 1, message: 'Baja lógica completada' }),
      getAuditLogs: () => of([]),
      getConfig: () =>
        of({
          application: 'ZONA FITNESS Core API',
          version: '2.0.0',
          environment: 'test',
          timestamp: new Date().toISOString(),
          database: { engine: 'PostgreSQL 18', connected_db: 'zona_fitness_db', connected_user: 'postgres' },
          security_policies: {
            data_protection_law: 'Ley 1581 de 2012 (Colombia)',
            payment_mode: 'OFICIAL Y VERIFICADO',
            password_hashing: 'bcrypt',
            jwt_expiration: '24h',
          },
        }),
      getUserDetail: (id: number) =>
        of({
          user: { id, name: 'Carlos Gomez', email: 'carlos@test.com', role: 'member', is_active: true },
          active_membership: null,
          memberships_history: [],
          orders_history: [],
          consents: [],
        }),
      updateUser: () => of({ id: 1, name: 'Admin Principal' }),
      toggleUserStatus: () => of({ success: true }),
      deleteUser: () => of({ success: true, retained_records: { orders: 1, memberships: 1 } }),
      updateMembership: () => of({ success: true }),
      updatePlan: () => of({ success: true, name: 'Cobre', price: 50000, duration_days: 15 }),
      getPlanHistory: () => of([]),
      togglePlanStatus: () => of({ success: true }),
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AdminService, useValue: adminServiceSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create admin dashboard with official logo and auth info', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    const logoImg = el.querySelector('.admin-sidebar-logo-img') as HTMLImageElement;
    expect(logoImg).toBeTruthy();
    expect(logoImg.getAttribute('src')).toBe('/zona-fitness-logo.png');
    expect(el.textContent).toContain('PANEL ADMINISTRATIVO');
    expect(el.textContent).toContain('Admin Principal');
    expect(el.textContent).toContain('admin@zonafitness.com');
  });

  it('renders revenue with official confirmed recaudo and disclaimer', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Recaudo y Facturación');
    expect(el.textContent).toContain('Recaudo Real Confirmado');
    expect(el.textContent).toContain('350,000');
    expect(el.textContent).toContain('COP');
  });

  it('starts in dashboard tab and switches cleanly between all administrative tabs including payments', () => {
    expect(component.activeTab).toBe('dashboard');

    component.setTab('users');
    expect(component.activeTab).toBe('users');

    component.setTab('payments');
    expect(component.activeTab).toBe('payments');

    component.setTab('memberships');
    expect(component.activeTab).toBe('memberships');

    component.setTab('plans');
    expect(component.activeTab).toBe('plans');

    component.setTab('orders');
    expect(component.activeTab).toBe('orders');

    component.setTab('audit');
    expect(component.activeTab).toBe('audit');

    component.setTab('config');
    expect(component.activeTab).toBe('config');
  });

  it('manages multiple user selection and triggers bulk actions bar', () => {
    component.setTab('users');
    fixture.detectChanges();

    // El admin actual (id 1) no puede seleccionarse
    component.toggleSelectUser(1);
    expect(component.selectedUserIds.has(1)).toBe(false);

    // Seleccionar usuario regular (id 2)
    component.toggleSelectUser(2);
    expect(component.selectedUserIds.has(2)).toBe(true);
    expect(component.selectedUserIds.size).toBe(1);

    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const bulkBar = el.querySelector('.bulk-actions-floating-bar');
    expect(bulkBar).toBeTruthy();
    expect(bulkBar?.textContent).toContain('1');
    expect(bulkBar?.textContent).toContain('usuario(s) seleccionado(s)');

    // Abrir modal de acción masiva
    component.openBulkActionModal('inactivate');
    expect(component.bulkActionType).toBe('inactivate');

    component.confirmBulkAction();
    expect(component.selectedUserIds.size).toBe(0);
  });

  it('manages payment approval with modal and activates membership', () => {
    component.setTab('payments');
    fixture.detectChanges();

    const payment = component.payments[0];
    expect(payment).toBeTruthy();

    component.openApproveConfirm(payment);
    expect(component.paymentToApprove).toBe(payment);

    component.confirmApprovePayment();
    expect(component.statusMessage).toContain('aprobado exitosamente');
    expect(component.paymentToApprove).toBeNull();
  });

  it('manages payment rejection requiring a clear reason', () => {
    component.setTab('payments');
    fixture.detectChanges();

    const payment = component.payments[0];
    component.openRejectModal(payment);
    expect(component.paymentToReject).toBe(payment);

    // Sin motivo
    component.rejectReason = '   ';
    component.confirmRejectPayment();
    expect(component.errorMessage).toContain('obligatorio indicar un motivo');

    // Con motivo válido
    component.rejectReason = 'Comprobante ilegible';
    component.confirmRejectPayment();
    expect(component.statusMessage).toContain('rechazado');
    expect(component.paymentToReject).toBeNull();
  });

  it('opens and closes user detail modal', () => {
    component.viewUserDetail(1);
    expect(component.selectedUserDetail).toBeTruthy();
    expect(component.selectedUserDetail.user.name).toBe('Carlos Gomez');

    component.closeUserDetail();
    expect(component.selectedUserDetail).toBeNull();
  });

  it('opens and closes safe delete confirmation modal', () => {
    const targetUser = { id: 3, name: 'Maria Lopez', email: 'maria@test.com' };
    component.openDeleteConfirm(targetUser);

    expect(component.userToDelete).toBeTruthy();
    expect(component.userToDelete.name).toBe('Maria Lopez');

    component.closeDeleteConfirm();
    expect(component.userToDelete).toBeNull();
    expect(component.deleteReason).toBe('');
  });

  it('opens and closes membership modification modal', () => {
    const membership = {
      id: 5,
      user_name: 'Ana Diaz',
      plan_name: 'Cobre',
      end_date: '2026-11-01',
      status: 'active',
      notes: '',
    };
    component.openEditMembership(membership);

    expect(component.membershipToEdit).toBeTruthy();
    expect(component.membershipEditForm.status).toBe('active');

    component.closeEditMembership();
    expect(component.membershipToEdit).toBeNull();
  });

  it('opens and closes plan edit modal', () => {
    const plan = { id: 1, name: 'Cobre', price: 45000, duration_days: 15, description: 'Básico' };
    component.openEditPlan(plan);

    expect(component.planToEdit).toBeTruthy();
    expect(component.planEditForm.price).toBe(45000);

    component.closeEditPlan();
    expect(component.planToEdit).toBeNull();
  });

  it('logs out and redirects to /admin/login', () => {
    const logoutSpy = vitest.spyOn(authServiceSpy, 'logout');
    const navigateSpy = vitest.spyOn(router, 'navigate');
    component.logout();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/login']);
  });
});
