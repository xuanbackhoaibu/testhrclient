# HRM Table UI audit

## Inventory (source verified)

### Shared `DataTable`

- Employees, accounts, pending HR links
- Organization: business sectors, units, departments, positions
- Attendance: records, sync runs, BioTime departments

### Standalone Ant Design tables

- Audit logs, contracts, leave, movements
- Onboarding and offboarding workflows
- Imports and Excel import previews

### Standalone Mantine tables

- Attendance mapping, employee detail tabs, permission groups
- Bulk account provisioning and account authorization modal/drawers

## Standard applied

- `DataTable` is also exported as `HrmDataTable`; its existing API remains valid.
- Server pagination retains its existing callback and now exposes a page-size control.
- `maxHeight` opt-in enables a sticky header without forcing vertical scrolling on
  existing pages.
- `SafeTooltip` renders in a portal and ignores empty labels.
- `EllipsisText` shows a tooltip only when measured text is actually clipped.
- `StatusTag` has a visible fallback for unknown statuses.
- AntD tables share the same light header, compact middle density and border
  treatment as `DataTable` without changing their data, pagination or actions.

## Follow-up migration order

1. Move workflow and audit AntD tables to `HrmDataTable` only after their
   server-side sort/filter contracts are individually verified.
2. Replace local truncation wrappers with `EllipsisText` in high-density cells.
3. Exercise tooltip/dropdown behavior manually inside drawers, modals and
   horizontal-scroll tables at 80%, 100%, 125% and 150% browser zoom.

No API contract, permission policy, data query, or business action was changed
by this UI foundation.
