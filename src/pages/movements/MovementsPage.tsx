import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  approveMovement,
  cancelMovement,
  createMovement,
  rejectMovement,
  submitMovement,
} from "../../features/movements/movementsApi";
import type {
  Movement,
  MovementPayload,
} from "../../features/movements/movementTypes";
import { useMovements } from "../../features/movements/useMovements";
import { mockEmployees } from "../../shared/mocks/mockEmployees";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { HrmDateInput } from '../../shared/components/HrmDateInput';
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { MOVEMENT_TYPE_OPTIONS } from "../../shared/constants/statuses";
import { formatDate } from "../../shared/utils/date";
import { useAuth } from "../../features/auth/useAuth";
import { HR_PERMISSIONS } from "../../features/auth/permissions";

export function MovementsPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [form] = Form.useForm<MovementPayload>();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Movement | null>(null);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employeeId: undefined as string | undefined,
    movementType: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = useMovements(params);

  function movementStep(record: Movement): number {
    if (record.status === "APPROVED") return 2;
    if (record.status === "SUBMITTED") return 1;
    if (record.status === "REJECTED" || record.status === "CANCELLED") return 1;
    return 0;
  }

  const createMutation = useMutation({
    mutationFn: createMovement,
    onSuccess: async () => {
      message.success("Đã tạo điều chuyển.");
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["movements"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "submit" | "approve" | "reject" | "cancel";
    }) => {
      switch (action) {
        case "submit":
          return submitMovement(id);
        case "approve":
          return approveMovement(id);
        case "reject":
          return rejectMovement(id);
        default:
          return cancelMovement(id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["movements"] });
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageHeader
        title="Điều chuyển"
        subtitle="Quy trình điều chuyển với các trạng thái gửi duyệt, duyệt, từ chối và hủy."
        actions={can(HR_PERMISSIONS.MOVEMENT_CREATE) ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Tạo mới
          </Button>
        ) : undefined}
      />
      <Card className="page-card">
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Select
                allowClear
                placeholder="Nhân viên"
                style={{ width: "100%" }}
                options={mockEmployees.map((item) => ({
                  value: item.id,
                  label: item.fullName,
                }))}
                onChange={(value) =>
                  setParams((current) => ({ ...current, employeeId: value }))
                }
              />
            </Col>
            <Col xs={24} md={8}>
              <Select
                allowClear
                placeholder="Loại điều chuyển"
                style={{ width: "100%" }}
                options={MOVEMENT_TYPE_OPTIONS.map((item) => ({
                  value: item,
                  label: item,
                }))}
                onChange={(value) =>
                  setParams((current) => ({ ...current, movementType: value }))
                }
              />
            </Col>
            <Col xs={24} md={8}>
              <Select
                allowClear
                placeholder="Trạng thái"
                style={{ width: "100%" }}
                options={[
                  "DRAFT",
                  "SUBMITTED",
                  "APPROVED",
                  "REJECTED",
                  "CANCELLED",
                ].map((item) => ({ value: item, label: item }))}
                onChange={(value) =>
                  setParams((current) => ({ ...current, status: value }))
                }
              />
            </Col>
          </Row>

          <Table
            rowKey="id"
            dataSource={data.items}
            pagination={{
              current: data.pagination.page,
              pageSize: data.pagination.pageSize,
              total: data.pagination.total,
              onChange: (page, pageSize) =>
                setParams((current) => ({ ...current, page, pageSize })),
            }}
            columns={[
              { title: "Nhân viên", dataIndex: "employeeName" },
              { title: "Loại", dataIndex: "movementType" },
              {
                title: "Ngày hiệu lực",
                render: (_, record) => formatDate(record.effectiveDate),
              },
              { title: "Lý do", dataIndex: "reason" },
              {
                title: "Trạng thái",
                render: (_, record) => <StatusTag status={record.status} />,
              },
              {
                title: "Thao tác",
                render: (_, record) => (
                  <Space wrap>
                    <Button onClick={() => setSelected(record)}>
                      Chi tiết
                    </Button>
                    {record.status === "DRAFT" && can(HR_PERMISSIONS.MOVEMENT_SUBMIT) ? (
                      <Button
                        onClick={() =>
                          statusMutation.mutate({
                            id: record.id,
                            action: "submit",
                          })
                        }
                      >
                        Gửi duyệt
                      </Button>
                    ) : null}
                    {record.status === "SUBMITTED" && can(HR_PERMISSIONS.MOVEMENT_APPROVE) ? (
                      <Button
                        onClick={() =>
                          statusMutation.mutate({
                            id: record.id,
                            action: "approve",
                          })
                        }
                      >
                        Duyệt
                      </Button>
                    ) : null}
                    {record.status === "SUBMITTED" && can(HR_PERMISSIONS.MOVEMENT_REJECT) ? (
                      <Button
                        danger
                        onClick={() =>
                          statusMutation.mutate({
                            id: record.id,
                            action: "reject",
                          })
                        }
                      >
                        Từ chối
                      </Button>
                    ) : null}
                    {["DRAFT", "SUBMITTED"].includes(record.status) && can(HR_PERMISSIONS.MOVEMENT_CANCEL) ? (
                      <Button
                        onClick={() =>
                          statusMutation.mutate({
                            id: record.id,
                            action: "cancel",
                          })
                        }
                      >
                        Hủy
                      </Button>
                    ) : null}
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Drawer
        title="Tạo điều chuyển"
        open={open}
        width={520}
        destroyOnClose
        onClose={() => {
          setOpen(false);
          form.resetFields();
        }}
        extra={
          <Button
            type="primary"
            loading={createMutation.isPending}
            onClick={() => void form.submit()}
          >
            Lưu
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
          initialValues={{ afterJson: '{\n  "departmentId": "ou-sales"\n}' }}
        >
          <Form.Item
            name="employeeId"
            label="Nhân viên"
            rules={[{ required: true }]}
          >
            <Select
              options={mockEmployees.map((item) => ({
                value: item.id,
                label: item.fullName,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="movementType"
            label="Loại điều chuyển"
            rules={[{ required: true }]}
          >
            <Select
              options={MOVEMENT_TYPE_OPTIONS.map((item) => ({
                value: item,
                label: item,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="effectiveDate"
            label="Ngày hiệu lực"
            rules={[{ required: true }]}
            getValueFromEvent={(value: string | null) => value ?? undefined}
          >
            <HrmDateInput style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="afterJson"
            label="afterJson"
            extra={
              'TRANSFER: {"departmentId":"ou-sales"} | STATUS_CHANGE: {"employmentStatus":"ACTIVE"} | TERMINATION: {"employmentStatus":"TERMINATED"}'
            }
            rules={[
              { required: true },
              {
                validator: async (_, value) => {
                  try {
                    JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(
                      new Error("afterJson phải là JSON hợp lệ."),
                    );
                  }
                },
              },
            ]}
          >
            <Input.TextArea rows={8} />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        open={Boolean(selected)}
        title="Chi tiết điều chuyển"
        footer={null}
        width={680}
        onCancel={() => setSelected(null)}
      >
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Steps
            current={selected ? movementStep(selected) : 0}
            status={selected?.status === "REJECTED" || selected?.status === "CANCELLED" ? "error" : "process"}
            items={[
              {
                title: "Nhân viên gửi",
                description: selected?.status === "DRAFT" ? "Đang soạn nháp" : "Đã ghi nhận yêu cầu",
              },
              {
                title: "Quản lý duyệt",
                description: selected?.status === "SUBMITTED" ? "Đang chờ xử lý" : selected?.status === "REJECTED" ? "Đã từ chối" : "Đã qua bước",
              },
              {
                title: "HR cập nhật",
                description: selected?.status === "APPROVED" ? "Đã sẵn sàng áp dụng" : "Chưa hoàn tất",
              },
            ]}
          />
          <Typography.Text type="secondary">
            Dữ liệu thay đổi sau duyệt
          </Typography.Text>
          <pre className="json-block">
            {JSON.stringify(selected?.afterJson ?? {}, null, 2)}
          </pre>
        </Space>
      </Modal>
    </>
  );
}
