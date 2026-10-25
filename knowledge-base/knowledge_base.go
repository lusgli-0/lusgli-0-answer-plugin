/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package knowledge_base

import (
	"embed"
	"encoding/json"
	"net"
	"strconv"
	"strings"
	"time"

	"github.com/apache/answer-plugins/util"
	"github.com/apache/answer/plugin"
	"github.com/gin-gonic/gin"
	"github.com/go-sql-driver/mysql"
	"github.com/lusgli-0/lusgli-0-answer-plugin/knowledge-base/i18n"
	"xorm.io/xorm"
)

//go:embed info.yaml components
var Info embed.FS

type KnowledgeBasePlugin struct {
	db *xorm.Engine
}

type databaseConfig struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	Database string `json:"database"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type KnowledgeBase struct {
	ID        int64     `xorm:"'id' pk autoincr" json:"id"`
	Title     string    `xorm:"varchar(255) notnull" json:"title"`
	CreatedAt time.Time `xorm:"created" json:"created_at"`
	UpdatedAt time.Time `xorm:"updated" json:"updated_at"`
}

type KnowledgeBaseNote struct {
	ID              int64     `xorm:"'id' pk autoincr" json:"id"`
	KnowledgeBaseID int64     `xorm:"'knowledge_base_id' notnull index" json:"knowledge_base_id"`
	Title           string    `xorm:"varchar(255) notnull" json:"title"`
	Content         string    `xorm:"mediumtext notnull" json:"content"`
	CreatedAt       time.Time `xorm:"created" json:"created_at"`
	UpdatedAt       time.Time `xorm:"updated" json:"updated_at"`
}

func (KnowledgeBase) TableName() string {
	return "kb_info"
}

func (KnowledgeBaseNote) TableName() string {
	return "kb_note"
}

func init() {
	plugin.Register(&KnowledgeBasePlugin{})
}

func (d KnowledgeBasePlugin) Info() plugin.Info {
	info := &util.Info{}
	info.GetInfo(Info)

	return plugin.Info{
		Name:        plugin.MakeTranslator(i18n.InfoName),
		SlugName:    info.SlugName,
		Description: plugin.MakeTranslator(i18n.InfoDescription),
		Author:      info.Author,
		Version:     info.Version,
		Link:        info.Link,
	}
}

func (p *KnowledgeBasePlugin) ConfigFields() []plugin.ConfigField {
	return []plugin.ConfigField{
		{
			Name:     "host",
			Type:     plugin.ConfigTypeInput,
			Title:    plugin.MakeTranslator(i18n.InfoHost),
			Required: true,
			UIOptions: plugin.ConfigFieldUIOptions{
				InputType:   plugin.InputTypeText,
				Placeholder: plugin.MakeTranslator(i18n.InfoHostPlaceholder),
			},
		},
		{
			Name:     "port",
			Type:     plugin.ConfigTypeInput,
			Title:    plugin.MakeTranslator(i18n.InfoPort),
			Required: true,
			UIOptions: plugin.ConfigFieldUIOptions{
				InputType:   plugin.InputTypeText,
				Placeholder: plugin.MakeTranslator(i18n.InfoPortPlaceholder),
			},
		},
		{
			Name:     "database",
			Type:     plugin.ConfigTypeInput,
			Title:    plugin.MakeTranslator(i18n.InfoDatabase),
			Required: true,
			UIOptions: plugin.ConfigFieldUIOptions{
				InputType:   plugin.InputTypeText,
				Placeholder: plugin.MakeTranslator(i18n.InfoDatabasePlaceholder),
			},
		},
		{
			Name:     "username",
			Type:     plugin.ConfigTypeInput,
			Title:    plugin.MakeTranslator(i18n.InfoUsername),
			Required: true,
			UIOptions: plugin.ConfigFieldUIOptions{
				InputType:   plugin.InputTypeText,
				Placeholder: plugin.MakeTranslator(i18n.InfoUsernamePlaceholder),
			},
		},
		{
			Name:      "password",
			Type:      plugin.ConfigTypeInput,
			Title:     plugin.MakeTranslator(i18n.InfoPassword),
			Required:  true,
			UIOptions: plugin.ConfigFieldUIOptions{InputType: plugin.InputTypePassword},
		},
	}
}

func (p *KnowledgeBasePlugin) RegisterUnAuthRouter(r *gin.RouterGroup) {
	r.GET("/knowledge-base/health", p.health)
	r.POST("/knowledge-base", p.createKnowledgeBase)
	r.GET("/knowledge-base", p.listKnowledgeBase)
	r.POST("/knowledge-base/:id/notes", p.createNote)
	r.GET("/knowledge-base/:id/notes", p.listNotes)
	r.PUT("/knowledge-base/:id/notes/:note_id", p.updateNote)
	r.DELETE("/knowledge-base/:id", p.deleteKnowledgeBase)
	r.DELETE("/knowledge-base/:id/notes/:note_id", p.deleteNote)
}

func (p *KnowledgeBasePlugin) RegisterAuthUserRouter(r *gin.RouterGroup) {}

func (p *KnowledgeBasePlugin) RegisterAuthAdminRouter(r *gin.RouterGroup) {}

func (p *KnowledgeBasePlugin) health(ctx *gin.Context) {
	if p.db == nil {
		ctx.JSON(503, gin.H{"error": "database is not configured"})
		return
	}

	if err := p.db.Ping(); err != nil {
		ctx.JSON(503, gin.H{"error": "database is unavailable"})
		return
	}

	ctx.JSON(200, gin.H{"status": "ok"})
}

func (p *KnowledgeBasePlugin) createKnowledgeBase(ctx *gin.Context) {
	var req struct {
		Title string `json:"title" binding:"required,max=255"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, gin.H{"error": "title is required and must be at most 255 characters"})
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		ctx.JSON(400, gin.H{"error": "title cannot be empty"})
		return
	}

	kb := KnowledgeBase{Title: req.Title}
	if _, err := p.db.Insert(&kb); err != nil {
		ctx.JSON(500, gin.H{"error": "failed to create knowledge base"})
		return
	}

	ctx.JSON(201, kb)
}

func (p *KnowledgeBasePlugin) listKnowledgeBase(ctx *gin.Context) {
	items := make([]KnowledgeBase, 0)

	session := p.db.NewSession()
	defer session.Close()
	if q := strings.TrimSpace(ctx.Query("q")); q != "" {
		session = session.Where("title LIKE ?", "%"+q+"%")
	}

	if err := session.Desc("updated_at").Find(&items); err != nil {
		ctx.JSON(500, gin.H{"error": "failed to list knowledge bases"})
		return
	}
	ctx.JSON(200, gin.H{
		"status": 200,
		"data":   gin.H{"items": items},
	})
}

// 一组辅助函数，用于检查知识库和笔记 ID 是否存在。
func (p *KnowledgeBasePlugin) checkKBIDExists(ctx *gin.Context, kbID int64) bool {
	exists, err := p.db.ID(kbID).Exist(&KnowledgeBase{})
	if err != nil {
		ctx.JSON(500, gin.H{"error": "failed to check knowledge base"})
		return false
	}
	if !exists {
		ctx.JSON(404, gin.H{"error": "knowledge base not found"})
		return false
	}
	return true
}

func (p *KnowledgeBasePlugin) checkNoteIDExists(ctx *gin.Context, kbID, noteID int64) bool {
	exists, err := p.db.ID(noteID).Get(&KnowledgeBaseNote{KnowledgeBaseID: kbID})
	if err != nil {
		ctx.JSON(500, gin.H{"error": "failed to check note"})
		return false
	}
	if !exists {
		ctx.JSON(404, gin.H{"error": "note not found"})
		return false
	}
	return true
}

func parsePositivePathID(ctx *gin.Context, paramName, entityName string) (int64, bool) {
	id, err := strconv.ParseInt(ctx.Param(paramName), 10, 64)
	if err != nil || id <= 0 {
		ctx.JSON(400, gin.H{"error": "invalid " + entityName + " ID"})
		return 0, false
	}
	return id, true
}

func (p *KnowledgeBasePlugin) getKnowledgeBaseID(ctx *gin.Context) (int64, bool) {
	kbID, ok := parsePositivePathID(ctx, "id", "knowledge base")
	if !ok || !p.checkKBIDExists(ctx, kbID) {
		return 0, false
	}
	return kbID, true
}

func (p *KnowledgeBasePlugin) getKnowledgeBaseNoteIDs(ctx *gin.Context) (int64, int64, bool) {
	kbID, ok := p.getKnowledgeBaseID(ctx)
	if !ok {
		return 0, 0, false
	}

	noteID, ok := parsePositivePathID(ctx, "note_id", "note")
	if !ok || !p.checkNoteIDExists(ctx, kbID, noteID) {
		return 0, 0, false
	}
	return kbID, noteID, true
}

func (p *KnowledgeBasePlugin) createNote(ctx *gin.Context) {
	kbID, ok := p.getKnowledgeBaseID(ctx)
	if !ok {
		return
	}

	var req struct {
		Title   string `json:"title" binding:"required,max=255"`
		Content string `json:"content" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, gin.H{"error": "title is required and must be at most 255 characters, content is required"})
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || req.Content == "" {
		ctx.JSON(400, gin.H{"error": "title and content cannot be empty"})
		return
	}

	note := KnowledgeBaseNote{
		KnowledgeBaseID: kbID,
		Title:           req.Title,
		Content:         req.Content,
	}
	if _, err := p.db.Insert(&note); err != nil {
		ctx.JSON(500, gin.H{"error": "failed to create note"})
		return
	}

	ctx.JSON(201, note)
}

func (p *KnowledgeBasePlugin) listNotes(ctx *gin.Context) {
	kbID, ok := p.getKnowledgeBaseID(ctx)
	if !ok {
		return
	}

	session := p.db.Where("knowledge_base_id = ?", kbID)
	defer session.Close()
	if q := strings.TrimSpace(ctx.Query("q")); q != "" {
		session = session.Where("title LIKE ? OR content LIKE ?", "%"+q+"%", "%"+q+"%")
	}

	notes := make([]KnowledgeBaseNote, 0)
	if err := session.Desc("updated_at").Find(&notes); err != nil {
		ctx.JSON(500, gin.H{"error": "failed to list notes"})
		return
	}
	ctx.JSON(200, gin.H{"items": notes})
}

func (p *KnowledgeBasePlugin) updateNote(ctx *gin.Context) {
	_, noteID, ok := p.getKnowledgeBaseNoteIDs(ctx)
	if !ok {
		return
	}

	var req struct {
		Title   string `json:"title" binding:"required,max=255"`
		Content string `json:"content" binding:"required"`
	}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, gin.H{"error": "title and content are required"})
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || strings.TrimSpace(req.Content) == "" {
		ctx.JSON(400, gin.H{"error": "title and content cannot be empty"})
		return
	}
	note := KnowledgeBaseNote{
		Title:   req.Title,
		Content: req.Content,
	}
	if _, err := p.db.ID(noteID).
		Cols("title", "content", "updated_at").
		Update(&note); err != nil {
		ctx.JSON(500, gin.H{"error": "failed to update note"})
		return
	}
	ctx.JSON(200, note)
}

func (p *KnowledgeBasePlugin) deleteNote(ctx *gin.Context) {
	kbID, noteID, ok := p.getKnowledgeBaseNoteIDs(ctx)
	if !ok {
		return
	}
	if _, err := p.db.ID(noteID).
		Where("knowledge_base_id = ?", kbID).
		Delete(&KnowledgeBaseNote{}); err != nil {
		ctx.JSON(500, gin.H{"error": "failed to delete note"})
		return
	}
	ctx.JSON(200, gin.H{"message": "note deleted"})
}

func (p *KnowledgeBasePlugin) deleteKnowledgeBase(ctx *gin.Context) {
	kbID, ok := p.getKnowledgeBaseID(ctx)
	if !ok {
		return
	}

	session := p.db.NewSession()
	defer session.Close()

	if _, err := session.Where("knowledge_base_id = ?", kbID).
		Delete(&KnowledgeBaseNote{}); err != nil {
		_ = session.Rollback()
		ctx.JSON(500, gin.H{"error": "failed to delete knowledge base notes"})
		return
	}
	if _, err := session.ID(kbID).Delete(&KnowledgeBase{}); err != nil {
		_ = session.Rollback()
		ctx.JSON(500, gin.H{"error": "failed to delete knowledge base"})
		return
	}
	if err := session.Commit(); err != nil {
		_ = session.Rollback()
		ctx.JSON(500, gin.H{"error": "failed to commit transaction"})
		return
	}
	ctx.JSON(200, gin.H{"message": "knowledge base and its notes deleted"})
}

func (p *KnowledgeBasePlugin) ConfigReceiver(config []byte) error {
	c := &databaseConfig{}
	_ = json.Unmarshal(config, c)
	mysqlConfig := mysql.Config{
		User:      c.Username,
		Passwd:    c.Password,
		Net:       "tcp",
		Addr:      net.JoinHostPort(c.Host, c.Port),
		DBName:    c.Database,
		Params:    map[string]string{"charset": "utf8mb4"},
		ParseTime: true,
		Loc:       time.UTC,
	}
	dsn := mysqlConfig.FormatDSN()
	if db, err := xorm.NewEngine("mysql", dsn); err != nil {
		if db != nil {
			_ = db.Close()
		}
		return err
	} else {
		if err := db.Ping(); err != nil {
			_ = db.Close()
			return err
		}
		p.db = db
	}

	if err := p.db.Sync2(new(KnowledgeBase), new(KnowledgeBaseNote)); err != nil {
		_ = p.db.Close()
		return err
	}
	return nil
}
