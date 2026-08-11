import { useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Drawer,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
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
  WorkflowItem,
} from "../../features/onboarding/onboardingTypes";
import type { OnboardingTemplate } from "../../features/onboarding/onboardingTypes";
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
  const [assetItem, setAssetItem] = useState<WorkflowItem | null>(null);
  const [assetForm] = Form.useForm<{ serial: string; issuedAt: string }>();
  const { data, isLoading, error, refetch } = useOnboarding({
    page: 1,
    pageSize: 50,
  });
  const onboardingQueryKey = ["onboarding", { page: 1, pageSize: 50 }] as const;

  function patchSelectedItem(itemId: string, status: string) {
    setSelected((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.id === itemId ? { ...item, status } : item,
            ),
          }
        : current,
    );
  }

  function patchOnboardingCache(itemId: string, status: string) {
    queryClient.setQueryData<{
      instances: OnboardingInstance[];
      templates: OnboardingTemplate[];
    }>(onboardingQueryKey, (current) =>
      current
        ? {
            ...current,
            instances: current.instances.map((instance) => ({
              ...instance,
              items: instance.items.map((item) =>
                item.id === itemId ? { ...item, status } : item,
              ),
            })),
          }
        : current,
    );
  }

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
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["onboarding"] });
      const previousData = queryClient.getQueryData<{
        instances: OnboardingInstance[];
        templates: OnboardingTemplate[];
      }>(onboardingQueryKey);
      const previousSelected = selected;
      patchOnboardingCache(id, status);
      patchSelectedItem(id, status);
      return { previousData, previousSelected };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(onboardingQueryKey, context.previousData);
      }
      if (context?.previousSelected) {
        setSelected(context.previousSelected);
      }
      message.error("Không cập nhật được checklist onboarding.");
    },
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

  function progressPercent(instance: OnboardingInstance): number {
    if (!instance.items.length) return instance.status === "COMPLETED" ? 100 : 0;
    const completed = instance.items.filter((item) => item.status === "COMPLETED").length;
    return Math.round((completed / instance.items.length) * 100);
  }

  function toggleChecklistItem(item: WorkflowItem, checked: boolean) {
    if (checked && item.title.toLowerCase().includes("laptop")) {
      setAssetItem(item);
      assetForm.setFieldsValue({ serial: "", issuedAt: new Date().toISOString().slice(0, 10) });
      return;
    }
    itemMutation.mutate({ id: item.id, status: checked ? "COMPLETED" : "IN_PROGRESS" });
  }

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
                      title: "Tiến độ",
                      width: 110,
                      render: (_, record) => (
                        <Progress type="circle" percent={progressPercent(record)} size={52} strokeColor="#10b981" />
                      ),
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
                title: "Checklist",
                render: (_, record) => (
                  <Space>
                    <Checkbox
                      checked={record.status === "COMPLETED"}
                      onChange={(event) => toggleChecklistItem(record, event.target.checked)}
                    />
                    <StatusTag status={record.status} />
                  </Space>
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

      <Modal
        open={Boolean(assetItem)}
        title="Cấp thiết bị onboarding"
        okText="Lưu và hoàn thành"
        cancelText="Hủy"
        onCancel={() => setAssetItem(null)}
        onOk={() => void assetForm.validateFields().then(() => {
          if (assetItem) {
            itemMutation.mutate({ id: assetItem.id, status: "COMPLETED" });
          }
          setAssetItem(null);
        })}
      >
        <Typography.Paragraph type="secondary">
          Nhập thông tin cấp phát trước khi hoàn thành bước này.
        </Typography.Paragraph>
        <Form form={assetForm} layout="vertical">
          <Form.Item name="serial" label="Serial máy" rules={[{ required: true, message: "Nhập serial máy." }]}>
            <Input />
          </Form.Item>
          <Form.Item name="issuedAt" label="Ngày cấp" rules={[{ required: true, message: "Chọn ngày cấp." }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
