import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BulkActionResult, PaymentRecord } from './models';

export interface AdminMetrics {
  users: {
    total: number;
    active: number;
    inactive: number;
    deleted?: number;
    admin_count?: number;
    regular_count?: number;
    total_users?: number;
    active_users?: number;
    inactive_users?: number;
  };
  memberships: {
    total: number;
    active: number;
    expired: number;
    expiring_soon: number;
    total_memberships?: number;
    active_memberships?: number;
    expired_memberships?: number;
    expiring_soon_memberships?: number;
  };
  plans?: {
    total: number;
    available: number;
  };
  orders: {
    total: number;
    approved: number;
    pending: number;
    cancelled?: number;
    total_orders?: number;
    approved_orders?: number;
    pending_orders?: number;
  };
  payments?: {
    total: number;
    pending_verifications: number;
    approved: number;
    rejected: number;
  };
  revenue: {
    simulated_revenue: number;
    real_revenue: number;
    disclaimer?: string;
  };
  recent_activity?: {
    orders: any[];
    memberships: any[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getMetrics(): Observable<AdminMetrics> {
    return this.http.get<AdminMetrics>(`${this.apiUrl}/admin/metrics`);
  }

  getUsers(search?: string, filter?: string): Observable<any[]> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (filter && filter !== 'all') {
      params = params.set('filter', filter);
    }
    return this.http.get<any[]>(`${this.apiUrl}/admin/users`, { params });
  }

  getUserDetail(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/users/${id}`);
  }

  updateUser(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/users/${id}`, payload);
  }

  toggleUserStatus(id: number, isActive: boolean, reason?: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/admin/users/${id}/status`, { is_active: isActive, reason });
  }

  deleteUser(id: number, reason?: string): Observable<any> {
    return this.http.request<any>('DELETE', `${this.apiUrl}/admin/users/${id}`, {
      body: { reason },
    });
  }

  getMemberships(search?: string, status?: string): Observable<any[]> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (status && status !== 'all') {
      params = params.set('status', status);
    }
    return this.http.get<any[]>(`${this.apiUrl}/admin/memberships`, { params });
  }

  updateMembership(id: number, payload: { end_date?: string; status?: string; notes?: string; reason: string }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/admin/memberships/${id}`, payload);
  }

  getPlans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/plans`);
  }

  getPlanHistory(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/plans/${id}/history`);
  }

  updatePlan(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/plans/${id}`, payload);
  }

  togglePlanStatus(id: number, isActive: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/admin/plans/${id}/status`, { is_active: isActive });
  }

  getOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/orders`);
  }

  getPayments(status?: string, search?: string): Observable<PaymentRecord[]> {
    let params = new HttpParams();
    if (status && status !== 'all') {
      params = params.set('status', status);
    }
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<PaymentRecord[]>(`${this.apiUrl}/admin/payments`, { params });
  }

  approvePayment(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/payments/${id}/approve`, {});
  }

  rejectPayment(id: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/payments/${id}/reject`, { reason });
  }

  bulkUpdateUserStatus(userIds: number[], isActive: boolean, reason?: string): Observable<BulkActionResult> {
    return this.http.post<BulkActionResult>(`${this.apiUrl}/admin/users/bulk-status`, {
      user_ids: userIds,
      is_active: isActive,
      reason,
    });
  }

  bulkDeleteUsers(userIds: number[], reason?: string): Observable<BulkActionResult> {
    return this.http.post<BulkActionResult>(`${this.apiUrl}/admin/users/bulk-delete`, {
      user_ids: userIds,
      reason,
    });
  }

  getAuditLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/audit-logs`);
  }

  getConfig(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/config`);
  }
}
