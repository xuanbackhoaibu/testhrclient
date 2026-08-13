import { useState } from "react";
import {
  Button,
  Card,
  Drawer,
  Form,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  completeOnboardingInstance,
  createOnboardingInstance,
  updateOnboardingItem,
} from "../../features/onboarding/onboardingApi";
import type {
  OnboardingInstance,
  OnboardingInstancePayload,
} from "../../features/onboarding/onboardingTypes";
import { useOnboarding } from "../../features/onboarding/useOnboarding";
import { mockEmployees } from "../../shared/mocks/mockEmployees";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { formatDate } from "../../shared/utils/date";

export function OnboardingPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<OnboardingInstancePayload>();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<OnboardingInstance | null>(null);
  const { data, isLoading, error, refetch } = useOnboarding({
    page: 1,
    pageSize: 50,
  });

  const createMutation = useMutation({
    mutationFn: createOnboardingInstance,
    onSuccess: async () => {
      message.success("Đã tạo đợt onboarding.");
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });

  const itemMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOnboardingItem(id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeOnboardingInstance,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      setSelected(null);
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
        title="Onboarding"
        subtitle="Mẫu và đợt onboarding cho nhân viên."
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Tạo đợt
          </Button>
        }
      />
      <Tabs
        items={[
          {
            key: "instances",
            label: "Đợt",
            children: (
              <Card className="page-card">
                <Table
                  rowKey="id"
                  dataSource={data.instances}
                  pagination={false}
                  columns={[
                    { title: "Nhân viên", dataIndex: "employeeName" },
                    { title: "Mẫu", dataIndex: "templateName" },
                    {
                      title: "Ngày bắt đầu",
                      render: (_, record) => formatDate(record.startDate),
                    },
                    {
                      title: "Trạng thái",
                      render: (_, record) => (
                        <StatusTag status={record.status} />
                      ),
                    },
                    {
                      title: "Thao tác",
                      render: (_, record) => (
                        <Button onClick={() => setSelected(record)}>
                          Xem danh sách kiểm tra
                        </Button>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: "templates",
            label: "Mẫu",
            children: (
              <Card className="page-card">
                <Table
                  rowKey="id"
                  dataSource={data.templates}
                  pagination={false}
                  columns={[
                    { title: "Tên", dataIndex: "name" },
                    { title: "Số lượng mục", dataIndex: "itemCount" },
                    {
                      title: "Trạng thái",
                      render: (_, record) => (
                        <StatusTag status={record.status} />
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Drawer
        title="Tạo đợt onboarding"
        open={open}
        width={420}
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
            name="templateName"
            label="Mẫu"
            rules={[{ required: true }]}
          >
            <Select
              options={data.templates.map((item) => ({
                value: item.name,
                label: item.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="startDate"
            label="Ngày bắt đầu"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "2026-04-25", label: "2026-04-25" },
                { value: "2026-05-01", label: "2026-05-01" },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        open={Boolean(selected)}
        title="Danh sách kiểm tra onboarding"
        footer={null}
        width={760}
        onCancel={() => setSelected(null)}
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Table
            rowKey="id"
            dataSource={selected?.items ?? []}
            pagination={false}
            columns={[
              { title: "Mục", dataIndex: "title" },
              { title: "Phụ trách", dataIndex: "owner" },
              {
                title: "Trạng thái",
                render: (_, record) => <StatusTag status={record.status} />,
              },
              {
                title: "Thao tác",
                render: (_, record) => (
                  <Select
                    size="small"
                    style={{ width: 150 }}
                    value={record.status}
                    options={["DRAFT", "IN_PROGRESS", "COMPLETED"].map(
                      (item) => ({ value: item, label: item }),
                    )}
                    onChange={(value) =>
                      itemMutation.mutate({ id: record.id, status: value })
                    }
                  />
                ),
              },
            ]}
          />
          {selected && selected.status !== "COMPLETED" ? (
            <Button
              type="primary"
              onClick={() => completeMutation.mutate(selected.id)}
            >
              Hoàn thành đợt
            </Button>
          ) : null}
        </Space>
      </Modal>
    </>
  );
}
